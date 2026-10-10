import asyncio
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from app.services.otp_service import OTPService
from app.services.pyrogram_engine import bot_engine
from app.services.group_link_cache import GroupLinkCache
from app.services.master_group_service import MasterGroupService
from app.database import get_supabase

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])

async def background_export_private_links(account_id: str, user_id: str, missing_chat_ids: list):
    """
    Tác vụ chạy ngầm thứ cấp: Thử export invite link cho các nhóm kín (private groups)
    nếu tài khoản có quyền admin/mời thành viên trong nhóm đó.
    """
    if not missing_chat_ids:
        return
    try:
        sb = get_supabase()
        if not sb:
            return
        acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
        if not acc_res.data:
            return
        client = await bot_engine.get_or_start_client(acc_res.data[0])
        if not client:
            return

        exported_map = {}
        for cid in missing_chat_ids:
            try:
                exp = await client.export_chat_invite_link(cid)
                if exp:
                    exported_map[cid] = {"link": exp, "username": ""}
            except Exception:
                pass

        if exported_map:
            GroupLinkCache.batch_set_links(exported_map)
            print(f"[Private Links Export] Exported links for {len(exported_map)} private groups")
            try:
                all_master = MasterGroupService.get_groups(user_id)
                for mg in all_master:
                    if not mg.get("invite_link") and mg.get("chat_id") in exported_map:
                        item = exported_map[mg["chat_id"]]
                        MasterGroupService.update_group(user_id, mg["id"], {
                            "invite_link": item["link"]
                        })
            except Exception:
                pass
    except Exception as e:
        print(f"[Private Links Export] Error: {e}")

async def background_scan_account_links(account_id: str, user_id: str):
    """
    Quét ngầm link và username nếu cần làm mới toàn bộ.
    """
    try:
        sb = get_supabase()
        if not sb:
            return
        acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
        if not acc_res.data:
            return
        client = await bot_engine.get_or_start_client(acc_res.data[0])
        if not client:
            return

        links_map = {}
        missing_cids = []
        try:
            async for d in client.get_dialogs():
                cid = d.chat.id
                c_link = None
                c_un = None
                if d.chat.username:
                    c_link = f"https://t.me/{d.chat.username}"
                    c_un = d.chat.username
                elif getattr(d.chat, "invite_link", None):
                    c_link = d.chat.invite_link
                elif getattr(d.chat, "usernames", None):
                    for u in d.chat.usernames:
                        if getattr(u, "username", None) and getattr(u, "is_active", True):
                            c_link = f"https://t.me/{u.username}"
                            c_un = u.username
                            break

                if c_link:
                    links_map[cid] = {
                        "link": c_link,
                        "username": c_un or ""
                    }
                else:
                    missing_cids.append(cid)
        except Exception as e:
            print(f"[Background Scan Links] Error get_dialogs: {e}")

        if links_map:
            GroupLinkCache.batch_set_links(links_map)
            print(f"[Background Scan Links] Successfully cached links for {len(links_map)} groups of {acc_res.data[0].get('phone_number')}")

            try:
                all_master = MasterGroupService.get_groups(user_id)
                for mg in all_master:
                    if not mg.get("invite_link") and mg.get("chat_id") in links_map:
                        item = links_map[mg["chat_id"]]
                        MasterGroupService.update_group(user_id, mg["id"], {
                            "invite_link": item["link"],
                            "username": item.get("username")
                        })
            except Exception:
                pass

        if missing_cids:
            asyncio.create_task(background_export_private_links(account_id, user_id, missing_cids[:20]))
    except Exception as e:
        print(f"[Background Scan Links] Error: {e}")

class RequestOTPBody(BaseModel):
    phone_number: str
    api_id: Optional[str] = None
    api_hash: Optional[str] = None
    user_id: Optional[str] = None

class VerifyOTPBody(BaseModel):
    login_id: str
    code: str
    password: Optional[str] = None
    user_id: str

class AccountActionBody(BaseModel):
    account_id: str

@router.post("/request-otp")
async def request_otp(body: RequestOTPBody):
    sb = get_supabase()
    if body.user_id and sb:
        try:
            from app.services.wallet_store import LocalWalletStore
            tier = LocalWalletStore.get_subscription_tier(body.user_id)
            max_allowed = 10 if tier == "VIP" else 3
            existing_accs = sb.table("telegram_accounts").select("id, phone_number").eq("user_id", body.user_id).execute()
            current_accs = existing_accs.data or []
            already_exists = any(a.get("phone_number") == body.phone_number for a in current_accs)
            if not already_exists and len(current_accs) >= max_allowed:
                raise HTTPException(
                    status_code=403,
                    detail=f"Tài khoản của bạn ({tier}) đã đạt giới hạn tối đa {max_allowed} tài khoản Telegram. Vui lòng nâng cấp gói VIP Pro để kết nối tối đa 10 tài khoản!"
                )
        except HTTPException:
            raise
        except Exception as e:
            print(f"[request_otp check limit] {e}")

    api_id_val = body.api_id
    api_hash_val = body.api_hash

    # Nếu chưa truyền api_id/hash, tự động lấy lại từ DB của user này nếu đã có tài khoản lưu trước đó
    if (not api_id_val or not api_hash_val) and body.user_id and sb:
        clean_phone = normalize_phone(body.phone_number)
        try:
            # 1. Kiểm tra tài khoản cùng số điện thoại (nếu là đăng nhập lại)
            exist_acc = sb.table("telegram_accounts").select("api_id, api_hash").eq("user_id", body.user_id).eq("phone_number", clean_phone).execute()
            if exist_acc.data and exist_acc.data[0].get("api_id") and exist_acc.data[0].get("api_hash"):
                api_id_val = str(exist_acc.data[0]["api_id"])
                api_hash_val = str(exist_acc.data[0]["api_hash"])
            else:
                # 2. Hoặc lấy cặp API ID & Hash của tài khoản gần nhất người dùng này đã cấu hình
                any_acc = sb.table("telegram_accounts").select("api_id, api_hash").eq("user_id", body.user_id).not_.is_("api_id", "null").order("created_at", desc=True).limit(1).execute()
                if any_acc.data and any_acc.data[0].get("api_id") and any_acc.data[0].get("api_hash"):
                    api_id_val = str(any_acc.data[0]["api_id"])
                    api_hash_val = str(any_acc.data[0]["api_hash"])
        except Exception:
            pass

    if not api_id_val or not str(api_id_val).strip():
        raise HTTPException(status_code=400, detail="Bắt buộc phải nhập API ID riêng của bạn! Vui lòng xem hướng dẫn lấy API ID & API Hash.")
    if not api_hash_val or not str(api_hash_val).strip():
        raise HTTPException(status_code=400, detail="Bắt buộc phải nhập API Hash riêng của bạn! Vui lòng xem hướng dẫn lấy API ID & API Hash.")

    result = await OTPService.request_otp(
        phone=body.phone_number,
        api_id=api_id_val,
        api_hash=api_hash_val
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Lỗi gửi mã OTP"))
    return result

@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPBody):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối CSDL Supabase")

    result = await OTPService.verify_otp(
        login_id=body.login_id,
        code=body.code,
        password=body.password
    )
    if not result.get("success"):
        if result.get("need_2fa"):
            return result
        raise HTTPException(status_code=400, detail=result.get("error", "Lỗi xác thực OTP"))

    # Kiểm tra hạn mức tài khoản Telegram theo gói cước (Free: tối đa 3, VIP: tối đa 10)
    try:
        from app.services.wallet_store import LocalWalletStore
        tier = LocalWalletStore.get_subscription_tier(body.user_id)
    except Exception:
        tier = "FREE"

    max_allowed = 10 if tier == "VIP" else 3
    existing_accs = sb.table("telegram_accounts").select("id, phone_number").eq("user_id", body.user_id).execute()
    current_accs = existing_accs.data or []
    phone_clean = result["phone_number"]
    already_exists = any(a.get("phone_number") == phone_clean for a in current_accs)

    if not already_exists and len(current_accs) >= max_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Tài khoản của bạn ({tier}) đã đạt giới hạn tối đa {max_allowed} tài khoản Telegram. Vui lòng nâng cấp VIP Pro để kết nối tối đa 10 tài khoản!"
        )

    try:
        from app.services.aes_cipher import encrypt_session_string
        # Insert tài khoản (mã hóa AES-256 session_string theo chuẩn bảo mật SDS FR-06)
        encrypted_session = encrypt_session_string(result["session_string"])
        acc_data = {
            "user_id": body.user_id,
            "phone_number": result["phone_number"],
            "session_string": encrypted_session,
            "api_id": result["api_id"],
            "api_hash": result["api_hash"],
            "account_name": result["account_name"],
            "status": "online",
            "last_active": "now()"
        }
        acc_insert = sb.table("telegram_accounts").upsert(acc_data, on_conflict="user_id,phone_number").execute()
        acc_id = acc_insert.data[0]["id"] if acc_insert.data else None

        # Lưu danh sách nhóm tự động tìm thấy & Cache link tức thì (Single-Pass)
        groups = result.get("groups", [])
        missing_cids = []
        if groups and acc_id:
            existing_cids = set()
            try:
                exist_res = sb.table("target_groups").select("chat_id").eq("user_id", body.user_id).eq("account_id", acc_id).execute()
                if exist_res.data:
                    existing_cids = {g["chat_id"] for g in exist_res.data}
            except Exception:
                pass

            group_records = []
            links_map = {}
            for g in groups:
                if g["chat_id"] not in existing_cids:
                    group_records.append({
                        "user_id": body.user_id,
                        "account_id": acc_id,
                        "chat_id": g["chat_id"],
                        "group_title": g["title"],
                        "is_active": True
                    })
                if g.get("link") or g.get("members_count"):
                    links_map[g["chat_id"]] = {
                        "link": g.get("link", ""),
                        "username": g.get("username", ""),
                        "members_count": g.get("members_count", 0)
                    }
                if not g.get("link"):
                    missing_cids.append(g["chat_id"])

            if group_records:
                sb.table("target_groups").insert(group_records).execute()
            if links_map:
                GroupLinkCache.batch_set_links(links_map)

        # Khởi động client trong PyrogramEngine
        if acc_insert.data:
            await bot_engine.get_or_start_client(acc_insert.data[0])
            if acc_id and missing_cids:
                asyncio.create_task(background_export_private_links(acc_id, body.user_id, missing_cids[:20]))

        return {
            "success": True,
            "message": f"Kết nối thành công tài khoản: {result['account_name']}!",
            "account": acc_insert.data[0] if acc_insert.data else None,
            "total_groups_scanned": len(groups)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lưu CSDL: {str(e)}")

@router.post("/start-bot")
async def start_account_bot(body: AccountActionBody):
    sb = get_supabase()
    res = sb.table("telegram_accounts").select("*").eq("id", body.account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    acc = res.data[0]
    client = await bot_engine.get_or_start_client(acc)
    if not client:
        err_msg = bot_engine.last_errors.get(body.account_id, "")
        if "AUTH_KEY_DUPLICATED" in err_msg:
            detail = f"Phiên đăng nhập Telegram ({acc.get('phone_number')}) đã bị thu hồi do AUTH_KEY_DUPLICATED (bị đăng nhập song song ở máy khác hoặc server khác). Bạn không cần xóa nick! Hãy bấm 'Đăng Nhập Lại' để nhận OTP mới và giữ nguyên toàn bộ nhóm!"
        elif "AUTH_KEY_UNREGISTERED" in err_msg or "SESSION_REVOKED" in err_msg:
            detail = f"Phiên Telegram ({acc.get('phone_number')}) đã bị hủy đăng nhập từ ứng dụng Telegram. Hãy bấm 'Đăng Nhập Lại' để cấp mã OTP mới (giữ nguyên toàn bộ nhóm)!"
        else:
            detail = f"Không thể khởi động nick {acc.get('phone_number')}: {err_msg or 'Lỗi kết nối tới Telegram'}"
        raise HTTPException(status_code=400, detail=detail)
    return {"success": True, "message": "Bot tài khoản đã hoạt động!"}

@router.get("/error-info/{account_id}")
async def get_account_error_info(account_id: str):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối CSDL Supabase")

    res = sb.table("telegram_accounts").select("id, user_id, phone_number, account_name, status, api_id").eq("id", account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    acc = res.data[0]

    raw_err = bot_engine.last_errors.get(account_id, "")
    if not raw_err and acc.get("status") == "error":
        full_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
        if full_res.data:
            await bot_engine.get_or_start_client(full_res.data[0])
            raw_err = bot_engine.last_errors.get(account_id, "")

    error_type = "UNKNOWN"
    title = "Lỗi Phiên Đăng Nhập Telegram"
    reason = "Phiên kết nối giữa hệ thống và tài khoản Telegram bị gián đoạn."
    solution = "Bạn không cần xóa tài khoản! Bấm nút 'Đăng Nhập Lại' bên dưới để nhận mã OTP mới từ Telegram. Toàn bộ danh sách nhóm mục tiêu và cấu hình sẽ được giữ nguyên 100%."

    if "AUTH_KEY_DUPLICATED" in raw_err:
        error_type = "AUTH_KEY_DUPLICATED"
        title = "Trùng Phiên Kết Nối Song Song (406)"
        reason = "Telegram phát hiện khóa phiên (Session) của tài khoản này đang được kết nối cùng lúc từ 2 nơi (ví dụ: máy tính Local và máy chủ Deploy Render cùng chạy song song). Telegram đã tự động hủy khóa phiên để bảo vệ tài khoản."
        solution = "Nếu đang chạy backend ở máy tính (local), hãy tắt terminal uvicorn khi dùng trên web Deploy. Sau đó bấm 'Đăng Nhập Lại' để nhận mã OTP mới (không cần xóa nick, giữ nguyên mọi nhóm)!"
    elif "AUTH_KEY_UNREGISTERED" in raw_err or "SESSION_REVOKED" in raw_err:
        error_type = "AUTH_KEY_UNREGISTERED"
        title = "Phiên Đăng Nhập Đã Bị Đăng Xuất (401)"
        reason = "Tài khoản đã bị đăng xuất khỏi hệ thống từ ứng dụng Telegram (do chọn Đăng xuất thiết bị khác)."
        solution = "Bấm 'Đăng Nhập Lại' bên dưới để nhập mã OTP mới từ Telegram và khôi phục hoạt động."
    elif "USER_DEACTIVATED" in raw_err:
        error_type = "USER_DEACTIVATED"
        title = "Tài Khoản Telegram Bị Hạn Chế / Vô Hiệu Hóa"
        reason = "Telegram phản hồi tài khoản này đã bị khóa hoặc vô hiệu hóa bởi chính sách của Telegram."
        solution = "Vui lòng mở ứng dụng Telegram để kiểm tra trạng thái nick này."
    elif "FLOOD_WAIT" in raw_err:
        error_type = "FLOOD_WAIT"
        title = "Giới Hạn Tần Suất Gửi Yêu Cầu (Flood Wait)"
        reason = f"Telegram yêu cầu tạm dừng hoạt động trong thời gian ngắn do gửi thao tác liên tục: {raw_err}"
        solution = "Vui lòng đợi vài phút rồi bấm 'Bật' lại tài khoản."
    elif raw_err:
        reason = f"Chi tiết phản hồi từ Telegram: {raw_err}"

    return {
        "success": True,
        "account_id": account_id,
        "phone_number": acc.get("phone_number"),
        "account_name": acc.get("account_name"),
        "status": acc.get("status"),
        "error_type": error_type,
        "title": title,
        "reason": reason,
        "solution": solution,
        "raw_error": raw_err or "Phiên Telegram gặp sự cố kết nối"
    }

@router.post("/stop-bot")
async def stop_account_bot(body: AccountActionBody):
    await bot_engine.stop_client(body.account_id)
    sb = get_supabase()
    if sb:
        sb.table("telegram_accounts").update({"status": "offline"}).eq("id", body.account_id).execute()
    return {"success": True, "message": "Đã ngắt kết nối tài khoản!"}

@router.post("/scan-groups")
async def scan_account_groups(body: AccountActionBody):
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=500, detail="Chưa kết nối CSDL Supabase")

    res = sb.table("telegram_accounts").select("*").eq("id", body.account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")

    acc = res.data[0]
    client = await bot_engine.get_or_start_client(acc)
    if not client:
        raise HTTPException(status_code=500, detail="Không thể kết nối Telegram client để quét nhóm")

    scanned_groups = []
    links_map = {}
    missing_cids = []
    try:
        from pyrogram.enums import ChatType
        async for dialog in client.get_dialogs():
            if dialog.chat.type in [ChatType.GROUP, ChatType.SUPERGROUP]:
                c_link = None
                c_un = None
                if dialog.chat.username:
                    c_link = f"https://t.me/{dialog.chat.username}"
                    c_un = dialog.chat.username
                elif getattr(dialog.chat, "invite_link", None):
                    c_link = dialog.chat.invite_link
                elif getattr(dialog.chat, "usernames", None):
                    for u in dialog.chat.usernames:
                        if getattr(u, "username", None) and getattr(u, "is_active", True):
                            c_link = f"https://t.me/{u.username}"
                            c_un = u.username
                            break

                m_count = getattr(dialog.chat, "members_count", 0) or 0
                scanned_groups.append({
                    "user_id": acc["user_id"],
                    "account_id": acc["id"],
                    "chat_id": dialog.chat.id,
                    "group_title": dialog.chat.title or "Nhóm không tên",
                    "is_active": True
                })
                links_map[dialog.chat.id] = {
                    "link": c_link or "",
                    "username": c_un or "",
                    "members_count": m_count
                }
                if not c_link:
                    missing_cids.append(dialog.chat.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi đọc danh sách nhóm từ Telegram: {str(e)}")

    if scanned_groups:
        try:
            # Xóa các nhóm cũ của tài khoản này và lưu lại danh sách mới nhất
            sb.table("target_groups").delete().eq("account_id", acc["id"]).execute()
            sb.table("target_groups").insert(scanned_groups).execute()

            # Cache ngay toàn bộ link vừa trích xuất được (0 network call)
            if links_map:
                GroupLinkCache.batch_set_links(links_map)
                try:
                    all_master = MasterGroupService.get_groups(acc["user_id"])
                    for mg in all_master:
                        if not mg.get("invite_link") and mg.get("chat_id") in links_map:
                            item = links_map[mg["chat_id"]]
                            MasterGroupService.update_group(acc["user_id"], mg["id"], {
                                "invite_link": item["link"],
                                "username": item.get("username")
                            })
                except Exception:
                    pass

            # Chỉ chạy ngầm đối với những nhóm kín chưa có link (thử export invite link nếu admin)
            if missing_cids:
                asyncio.create_task(background_export_private_links(body.account_id, acc["user_id"], missing_cids[:20]))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi lưu nhóm vào CSDL: {str(e)}")

    return {
        "success": True,
        "message": f"Đã quét thành công {len(scanned_groups)} nhóm từ Telegram!",
        "count": len(scanned_groups),
        "groups": scanned_groups
    }

