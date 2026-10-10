import json
import asyncio
import re
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database import get_supabase
from app.services.master_group_service import MasterGroupService
from app.services.group_joiner import GroupJoinerService
from app.services.group_link_cache import GroupLinkCache
from app.services.pyrogram_engine import bot_engine

router = APIRouter(prefix="/api/groups", tags=["Groups"])

class MasterGroupCreate(BaseModel):
    user_id: str
    group_title: str
    invite_link: Optional[str] = ""
    account_id: Optional[str] = None
    chat_id: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class MasterGroupUpdate(BaseModel):
    user_id: str
    group_title: Optional[str] = None
    invite_link: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class AutoJoinRequest(BaseModel):
    user_id: str
    account_id: str
    group_ids: Optional[List[str]] = None
    min_delay: Optional[float] = 6.0
    max_delay: Optional[float] = 12.0

async def find_telegram_chat(client, chat_id: int):
    """
    Tìm chat Telegram an toàn. Nếu get_chat bị lỗi 'Peer id invalid'
    (do Pyrogram dùng in-memory session chưa nạp cache peer), hàm sẽ
    quét qua dialogs để nạp peer vào cache và lấy chat đầy đủ.
    """
    try:
        chat = await client.get_chat(chat_id)
        if chat:
            return chat
    except Exception:
        pass

    try:
        async for dialog in client.get_dialogs():
            if dialog.chat.id == chat_id:
                if dialog.chat.username or getattr(dialog.chat, "invite_link", None):
                    return dialog.chat
                try:
                    full = await client.get_chat(chat_id)
                    if full:
                        return full
                except Exception:
                    return dialog.chat
    except Exception:
        pass

    return None

async def extract_chat_link(client, chat_id: int) -> Dict[str, Any]:
    """
    Trích xuất link Telegram (username công khai, invite link sẵn có, hoặc export link)
    """
    chat = await find_telegram_chat(client, chat_id)
    if not chat:
        return {"found": False, "link": "", "type": "not_found", "username": None, "title": None}

    title = chat.title or "Nhóm Telegram"

    # 1. Nhóm công khai có username (@username hoặc t.me/username)
    if chat.username:
        return {
            "found": True,
            "link": f"https://t.me/{chat.username}",
            "type": "public",
            "username": chat.username,
            "title": title
        }

    # 2. Invite link sẵn có trong chat object
    if getattr(chat, "invite_link", None):
        return {
            "found": True,
            "link": chat.invite_link,
            "type": "invite_link",
            "username": None,
            "title": title
        }

    # 3. Danh sách active usernames (Telegram Multi-usernames / Fragment)
    if getattr(chat, "usernames", None):
        for u in chat.usernames:
            if getattr(u, "username", None) and getattr(u, "is_active", True):
                return {
                    "found": True,
                    "link": f"https://t.me/{u.username}",
                    "type": "public",
                    "username": u.username,
                    "title": title
                }

    # 4. Thử export invite link nếu có quyền mời
    try:
        exp = await client.export_chat_invite_link(chat_id)
        if exp:
            return {
                "found": True,
                "link": exp,
                "type": "exported",
                "username": None,
                "title": title
            }
    except Exception:
        pass

    return {
        "found": False,
        "link": "",
        "type": "private_restricted",
        "username": None,
        "title": title
    }

async def get_client_for_chat(sb, user_id: str, chat_id: Optional[int], preferred_account_id: Optional[str] = None):
    """
    Tìm Telegram client phù hợp nhất để truy vấn thông tin nhóm.
    Ưu tiên tài khoản được chọn, nếu không có thì tìm tài khoản sở hữu chat_id trong target_groups.
    """
    if preferred_account_id:
        acc_res = sb.table("telegram_accounts").select("*").eq("id", preferred_account_id).execute()
        if acc_res.data:
            c = await bot_engine.get_or_start_client(acc_res.data[0])
            if c:
                return c, acc_res.data[0]

    if chat_id:
        tg_res = sb.table("target_groups").select("account_id").eq("chat_id", chat_id).limit(1).execute()
        if tg_res.data and tg_res.data[0].get("account_id"):
            found_acc_id = tg_res.data[0]["account_id"]
            acc_res = sb.table("telegram_accounts").select("*").eq("id", found_acc_id).execute()
            if acc_res.data:
                c = await bot_engine.get_or_start_client(acc_res.data[0])
                if c:
                    return c, acc_res.data[0]

    all_accs = sb.table("telegram_accounts").select("*").eq("user_id", user_id).execute()
    for acc in all_accs.data or []:
        c = await bot_engine.get_or_start_client(acc)
        if c:
            return c, acc

    return None, None

@router.get("/metadata")
def get_groups_metadata():
    """Lấy map thông tin cache (link, username, members_count) của tất cả các nhóm (0 network call)"""
    return {
        "success": True,
        "data": GroupLinkCache.get_all()
    }

@router.get("/master")
def get_master_groups(user_id: str = Query(...)):
    """Lấy danh sách các nhóm chung (Master Groups) của người dùng kèm số lượng thành viên"""
    groups = MasterGroupService.get_groups(user_id)
    cache = GroupLinkCache.get_all()
    for g in groups:
        cid = g.get("chat_id")
        if cid:
            cached_info = cache.get(str(cid))
            if cached_info:
                if not g.get("members_count") and cached_info.get("members_count"):
                    g["members_count"] = cached_info["members_count"]
                if not g.get("invite_link") and cached_info.get("link"):
                    g["invite_link"] = cached_info["link"]
                if not g.get("username") and cached_info.get("username"):
                    g["username"] = cached_info["username"]
    return {
        "success": True,
        "count": len(groups),
        "data": groups
    }

@router.post("/master/toggle")
async def toggle_master_group(payload: MasterGroupCreate):
    """
    1-Click Toggle: Bấm vào ngôi sao để tự động thêm hoặc gỡ nhóm khỏi kho chung.
    Tự động dò link Telegram ngầm qua client nếu chưa có link.
    """
    all_groups = MasterGroupService.get_groups(payload.user_id)
    existing = None
    for g in all_groups:
        if payload.chat_id and g.get("chat_id") == payload.chat_id:
            existing = g
            break
        elif g.get("group_title") == payload.group_title:
            existing = g
            break

    if existing:
        # Đã tồn tại -> Gỡ bỏ khỏi kho
        MasterGroupService.delete_group(payload.user_id, existing["id"])
        return {
            "success": True,
            "action": "removed",
            "is_master": False,
            "message": f"Đã gỡ '{payload.group_title}' khỏi Kho Nhóm Chung",
            "group_id": existing["id"]
        }
    else:
        # Chưa tồn tại -> Thêm vào kho
        data = payload.dict()
        link_detected = False
        if not data.get("invite_link") and payload.chat_id:
            # 1. Kiểm tra ngay trong GroupLinkCache đã được quét ngầm từ trước
            cached = GroupLinkCache.get_link(payload.chat_id)
            if cached and cached.get("link"):
                data["invite_link"] = cached["link"]
                if cached.get("username"):
                    data["username"] = cached["username"]
                link_detected = True
            else:
                try:
                    sb = get_supabase()
                    if sb:
                        client, _ = await get_client_for_chat(sb, payload.user_id, payload.chat_id, payload.account_id)
                        if client:
                            link_res = await extract_chat_link(client, payload.chat_id)
                            if link_res["found"] and link_res["link"]:
                                data["invite_link"] = link_res["link"]
                                if link_res.get("username"):
                                    data["username"] = link_res["username"]
                                link_detected = True
                                GroupLinkCache.set_link(payload.chat_id, link_res["link"], link_res.get("username"))
                except Exception as e:
                    print(f"[Groups] Could not detect Telegram link: {e}")

        added = MasterGroupService.add_group(payload.user_id, data)
        msg = f"Đã thêm '{payload.group_title}' vào Kho Nhóm Chung"
        if link_detected:
            msg += f" (Đã có link: {data['invite_link']})"
        return {
            "success": True,
            "action": "added",
            "is_master": True,
            "message": msg,
            "data": added
        }

async def enrich_master_groups_background(user_id: str, account_id: Optional[str] = None):
    """
    Tác vụ chạy ngầm: Tự động quét và cập nhật link/username Telegram cho các nhóm chung
    mà không làm nghẽn hoặc đơ luồng xử lý chính của người dùng.
    """
    try:
        sb = get_supabase()
        all_groups = MasterGroupService.get_groups(user_id)
        missing = [g for g in all_groups if not g.get("invite_link") and g.get("chat_id")]
        if not missing:
            return

        client = None
        if account_id and sb:
            acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
            if acc_res.data:
                client = await bot_engine.get_or_start_client(acc_res.data[0])

        if not client and sb:
            all_accs = sb.table("telegram_accounts").select("*").eq("user_id", user_id).execute()
            for acc in all_accs.data or []:
                c = await bot_engine.get_or_start_client(acc)
                if c:
                    client = c
                    break

        if not client:
            return

        # Nạp dialogs vào map một lần duy nhất (cực nhanh)
        dialog_map = {}
        try:
            async for d in client.get_dialogs():
                dialog_map[d.chat.id] = d.chat
        except Exception as e:
            print(f"[Groups] Background get_dialogs error: {e}")

        # Bổ sung link cho các nhóm đang thiếu
        updated_count = 0
        for g in missing:
            c_id = g.get("chat_id")
            chat_obj = dialog_map.get(c_id)
            new_link = None
            new_username = None

            if chat_obj:
                if chat_obj.username:
                    new_link = f"https://t.me/{chat_obj.username}"
                    new_username = chat_obj.username
                elif getattr(chat_obj, "invite_link", None):
                    new_link = chat_obj.invite_link
                elif getattr(chat_obj, "usernames", None):
                    for u in chat_obj.usernames:
                        if getattr(u, "username", None) and getattr(u, "is_active", True):
                            new_link = f"https://t.me/{u.username}"
                            new_username = u.username
                            break

            if not new_link and c_id:
                try:
                    exp = await client.export_chat_invite_link(c_id)
                    if exp:
                        new_link = exp
                except Exception:
                    pass

            if new_link:
                MasterGroupService.update_group(user_id, g["id"], {
                    "invite_link": new_link,
                    "username": new_username
                })
                GroupLinkCache.set_link(c_id, new_link, new_username)
                updated_count += 1

        print(f"[Groups Background] Da cap nhat link cho {updated_count}/{len(missing)} nhom chung!")
    except Exception as e:
        print(f"[Groups Background] Error: {e}")

class MasterGroupBatchToggle(BaseModel):
    user_id: str
    action: str  # "add" or "remove"
    account_id: Optional[str] = None
    groups: List[Dict[str, Any]]

@router.post("/master/toggle-all")
async def toggle_all_master_groups(payload: MasterGroupBatchToggle):
    """
    1-Click All: Thêm tất cả hoặc gỡ tất cả danh sách nhóm vào/khỏi kho nhóm chung.
    Phản hồi tức thì trong vài mili-giây, link đã được nạp sẵn từ GroupLinkCache.
    """
    all_groups = MasterGroupService.get_groups(payload.user_id)
    chat_id_set = {str(g.get("chat_id")) for g in all_groups if g.get("chat_id")}
    title_set = {str(g.get("group_title")) for g in all_groups if g.get("group_title")}

    affected_count = 0
    if payload.action == "add":
        for grp in payload.groups:
            c_id = grp.get("chat_id")
            title = grp.get("group_title") or "Nhóm Telegram"
            str_cid = str(c_id) if c_id else None

            # Bỏ qua nếu đã có trong kho
            if str_cid and str_cid in chat_id_set:
                continue
            if title in title_set:
                continue

            data = {
                "group_title": title,
                "chat_id": c_id,
                "invite_link": grp.get("invite_link") or "",
                "notes": grp.get("notes") or ""
            }

            # NẾU CHƯA CÓ LINK, LẤY NGAY TỪ LINK CACHE ĐÃ ĐƯỢC QUÉT SẴN TỪ BƯỚC 1!
            if not data["invite_link"] and c_id:
                cached = GroupLinkCache.get_link(c_id)
                if cached and cached.get("link"):
                    data["invite_link"] = cached["link"]
                    data["username"] = cached.get("username")

            MasterGroupService.add_group(payload.user_id, data)
            if str_cid:
                chat_id_set.add(str_cid)
            title_set.add(title)
            affected_count += 1

        # Chạy tác vụ quét link ngầm bổ sung nếu còn sót nhóm nào chưa có link
        asyncio.create_task(enrich_master_groups_background(payload.user_id, payload.account_id))

        return {
            "success": True,
            "action": "added",
            "count": affected_count,
            "message": f"Đã thêm {affected_count} nhóm vào Kho Nhóm Chung! Link đã được đồng bộ tự động."
        }
    else:
        # Gỡ tất cả các nhóm được chỉ định
        c_ids_to_remove = {str(grp.get("chat_id")) for grp in payload.groups if grp.get("chat_id")}
        titles_to_remove = {str(grp.get("group_title")) for grp in payload.groups if grp.get("group_title")}

        for g in all_groups:
            gid = g.get("id")
            g_cid = str(g.get("chat_id")) if g.get("chat_id") else None
            g_title = str(g.get("group_title"))

            if (g_cid and g_cid in c_ids_to_remove) or (g_title in titles_to_remove):
                MasterGroupService.delete_group(payload.user_id, gid)
                affected_count += 1

        return {
            "success": True,
            "action": "removed",
            "count": affected_count,
            "message": f"Đã gỡ {affected_count} nhóm khỏi Kho Nhóm Chung!"
        }

@router.post("/master")
def create_master_group(payload: MasterGroupCreate):
    """Tạo hoặc thêm một nhóm chung mới vào kho (Link mời là tùy chọn)"""
    group = MasterGroupService.add_group(payload.user_id, payload.dict())
    return {
        "success": True,
        "message": "Đã thêm nhóm vào Kho Nhóm Chung!",
        "data": group
    }

@router.put("/master/{group_id}")
def update_master_group(group_id: str, payload: MasterGroupUpdate):
    """Cập nhật thông tin nhóm chung"""
    update_data = {k: v for k, v in payload.dict().items() if v is not None and k != "user_id"}
    updated = MasterGroupService.update_group(payload.user_id, group_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhóm chung này")
    return {
        "success": True,
        "message": "Đã cập nhật nhóm chung!",
        "data": updated
    }

@router.delete("/master/{group_id}")
def delete_master_group(group_id: str, user_id: str = Query(...)):
    """Xóa nhóm chung khỏi kho"""
    deleted = MasterGroupService.delete_group(user_id, group_id)
    return {
        "success": True,
        "message": "Đã xóa nhóm khỏi Kho Nhóm Chung!"
    }

@router.get("/detect-link")
async def detect_group_link(
    chat_id: int = Query(...), 
    account_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    """
    Tự động truy vấn và trích xuất link mời hoặc username của một nhóm
    từ tài khoản Telegram đã tham gia nhóm đó.
    """
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")

    client, acc = await get_client_for_chat(sb, user_id or "", chat_id, account_id)
    if not client:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Telegram phù hợp để truy vấn nhóm này")

    try:
        link_res = await extract_chat_link(client, chat_id)
        if link_res["found"] and link_res["link"]:
            return {
                "success": True,
                "found": True,
                "link": link_res["link"],
                "type": link_res["type"],
                "username": link_res.get("username"),
                "title": link_res.get("title"),
                "message": f"Đã tìm thấy link: {link_res['link']}"
            }
        else:
            return {
                "success": True,
                "found": False,
                "link": "",
                "type": link_res.get("type", "private_restricted"),
                "title": link_res.get("title"),
                "message": "Nhóm kín và Telegram yêu cầu quyền admin để tạo link mời. Vui lòng bấm '+ Bổ sung' để dán link mời thủ công."
            }
    except Exception as e:
        return {
            "success": False,
            "found": False,
            "link": "",
            "message": f"Không thể đọc thông tin nhóm từ Telegram: {str(e)}"
        }

@router.post("/auto-join")
async def auto_join_master_groups(payload: AutoJoinRequest):
    """
    Thực hiện quy trình tự động tham gia các nhóm chung cho một tài khoản Telegram.
    Trả về SSE stream (text/event-stream) để Frontend hiển thị tiến trình theo thời gian thực.
    """
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối Supabase")

    # Lấy thông tin tài khoản
    acc_res = sb.table("telegram_accounts").select("*").eq("id", payload.account_id).eq("user_id", payload.user_id).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản Telegram")
    account = acc_res.data[0]

    # Khởi động Client Pyrogram
    client = await bot_engine.get_or_start_client(account)
    if not client:
        raise HTTPException(status_code=500, detail="Không thể kết nối Telegram client để thực hiện join")

    # Lấy danh sách nhóm chung
    all_master = MasterGroupService.get_groups(payload.user_id)
    if payload.group_ids:
        selected_groups = [g for g in all_master if g.get("id") in payload.group_ids and g.get("is_active", True)]
    else:
        selected_groups = [g for g in all_master if g.get("is_active", True)]

    if not selected_groups:
        raise HTTPException(status_code=400, detail="Chưa có nhóm chung nào được chọn hoặc được kích hoạt")

    min_delay = max(payload.min_delay or 5.0, 3.0)  # Tối thiểu 3s để tránh Telegram block
    max_delay = max(payload.max_delay or 10.0, min_delay + 1.0)

    async def event_generator():
        async for evt in GroupJoinerService.stream_join_groups(
            client=client,
            account=account,
            master_groups=selected_groups,
            min_delay=min_delay,
            max_delay=max_delay
        ):
            # Định dạng Server-Sent Events (SSE)
            yield f"data: {json.dumps(evt, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/errors")
async def get_groups_error_status(user_id: str = Query(...)):
    """
    Lấy danh sách lỗi gần nhất và trạng thái tự động bỏ qua (Circuit Breaker) của các nhóm mục tiêu.
    Đồng bộ dữ liệu từ Database (bot_logs & target_groups) và runtime state của engine.
    """
    sb = get_supabase()
    result: Dict[str, Any] = {}

    # 1. Quét Circuit Breaker runtime state từ bot_engine
    runtime_cb = getattr(bot_engine, "circuit_breakers", {}).get(user_id, {})
    for cid, stat in runtime_cb.items():
        cid_str = str(cid)
        banned_cnt = stat.get("banned_count", 0)
        is_forbidden = stat.get("forbidden", False)
        is_skipped = is_forbidden or (banned_cnt >= 2)
        skip_reason = ""
        if is_forbidden:
            skip_reason = "Nhóm khóa chat (Chỉ Admin) — Đã tự động bỏ qua"
        elif banned_cnt >= 2:
            skip_reason = f"Tài khoản bị cấm chat {banned_cnt} chu kỳ liên tiếp — Đã tự động bỏ qua"

        result[cid_str] = {
            "last_error": stat.get("last_error", ""),
            "last_error_at": stat.get("last_error_at", ""),
            "is_skipped": is_skipped,
            "skip_reason": skip_reason,
            "banned_count": banned_cnt,
            "is_forbidden": is_forbidden
        }

    # 2. Đọc từ target_groups trong DB Supabase (nếu có cột last_error)
    if sb:
        try:
            tg_res = sb.table("target_groups").select("chat_id, group_title, last_error, last_error_at").eq("user_id", user_id).not_.is_("last_error", "null").execute()
            for r in (tg_res.data or []):
                cid_str = str(r["chat_id"])
                if cid_str not in result and r.get("last_error"):
                    err_txt = r.get("last_error", "")
                    is_forb = "khóa chat" in err_txt.lower() or "admin" in err_txt.lower()
                    is_ban = "cấm chat" in err_txt.lower() or "spambot" in err_txt.lower()
                    result[cid_str] = {
                        "last_error": err_txt,
                        "last_error_at": r.get("last_error_at"),
                        "is_skipped": is_forb,
                        "skip_reason": "Nhóm khóa chat" if is_forb else ("Bị cấm chat" if is_ban else ""),
                        "is_forbidden": is_forb,
                        "is_banned": is_ban
                    }
        except Exception:
            pass

    # 3. Quét bot_logs trong DB Supabase (Đảm bảo 100% lấy được lỗi đã lưu trong DB)
    if sb:
        try:
            logs_res = sb.table("bot_logs").select("message, log_type, created_at").eq("user_id", user_id).in_("log_type", ["error", "warning"]).order("created_at", desc=True).limit(100).execute()
            for log in (logs_res.data or []):
                msg = log.get("message", "")
                m = re.search(r"Lỗi gửi tới nhóm '([^']+)'\s*(?:----|:)\s*(.+)", msg)
                if m:
                    g_title = m.group(1).strip()
                    err_text = m.group(2).strip()
                    if g_title not in result:
                        is_forb = "khóa chat" in err_text.lower() or "admin" in err_text.lower()
                        is_ban = "cấm chat" in err_text.lower() or "spambot" in err_text.lower()
                        result[g_title] = {
                            "last_error": err_text,
                            "last_error_at": log.get("created_at"),
                            "is_skipped": is_forb,
                            "skip_reason": "Nhóm khóa chat" if is_forb else ("Bị cấm chat" if is_ban else ""),
                            "is_forbidden": is_forb,
                            "is_banned": is_ban
                        }
        except Exception:
            pass

    return {"success": True, "data": result}
