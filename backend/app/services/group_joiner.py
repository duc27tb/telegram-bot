import asyncio
import random
import time

try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from typing import Dict, Any, List, AsyncGenerator
from pyrogram import Client
from pyrogram.errors import (
    UserAlreadyParticipant,
    InviteRequestSent,
    FloodWait,
    ChannelsTooMuch,
    InviteHashExpired,
    InviteHashInvalid,
    UsernameInvalid,
    UsernameNotOccupied,
    PeerFlood,
    RPCError
)
from app.database import get_supabase
from app.services.activity_service import ActivityService
from app.services.master_group_service import clean_telegram_link

class GroupJoinerService:
    @classmethod
    async def join_single_group(cls, client: Client, link: str, title: str) -> Dict[str, Any]:
        """Thực hiện tham gia 1 nhóm cụ thể với đầy đủ xử lý mã lỗi bảo vệ tài khoản"""
        cleaned = clean_telegram_link(link)
        if not cleaned:
            return {
                "success": False,
                "status": "NO_LINK",
                "message": "Không có link mời hoặc username hợp lệ",
                "chat": None
            }

        try:
            chat = await client.join_chat(cleaned)
            return {
                "success": True,
                "status": "SUCCESS",
                "message": f"Đã tham gia thành công nhóm: {chat.title or title}",
                "chat": {
                    "id": chat.id,
                    "title": chat.title or title,
                    "username": chat.username
                }
            }
        except UserAlreadyParticipant:
            # Tài khoản đã ở trong nhóm từ trước -> Coi như thành công
            return {
                "success": True,
                "status": "ALREADY_JOINED",
                "message": "Tài khoản đã ở trong nhóm này từ trước",
                "chat": None
            }
        except InviteRequestSent:
            # Nhóm yêu cầu admin duyệt
            return {
                "success": True,
                "status": "REQUEST_SENT",
                "message": "Đã gửi yêu cầu tham gia (Chờ Admin nhóm phê duyệt)",
                "chat": None
            }
        except ChannelsTooMuch:
            return {
                "success": False,
                "status": "MAX_LIMIT",
                "stop_all": True,
                "message": "Tài khoản đã đạt giới hạn tối đa 500 nhóm/kênh của Telegram!",
                "chat": None
            }
        except PeerFlood:
            return {
                "success": False,
                "status": "PEER_FLOOD",
                "stop_all": True,
                "message": "Tài khoản bị Telegram hạn chế PEER_FLOOD (chống spam). Đã dừng để bảo vệ tài khoản an toàn!",
                "chat": None
            }
        except InviteHashExpired:
            return {
                "success": False,
                "status": "EXPIRED_LINK",
                "message": "Link mời đã hết hạn",
                "chat": None
            }
        except InviteHashInvalid:
            return {
                "success": False,
                "status": "INVALID_LINK",
                "message": "Link mời không hợp lệ",
                "chat": None
            }
        except (UsernameInvalid, UsernameNotOccupied):
            return {
                "success": False,
                "status": "INVALID_USERNAME",
                "message": "Nhóm không tồn tại hoặc username bị đổi",
                "chat": None
            }
        except FloodWait as e:
            return {
                "success": False,
                "status": "FLOOD_WAIT",
                "wait_seconds": e.value,
                "stop_all": (e.value > 30),
                "message": f"Telegram FloodWait: Yêu cầu chờ {e.value}s để chống spam",
                "chat": None
            }
        except RPCError as e:
            return {
                "success": False,
                "status": "RPC_ERROR",
                "message": f"Lỗi Telegram RPC: {e.MESSAGE or str(e)}",
                "chat": None
            }
        except Exception as e:
            return {
                "success": False,
                "status": "ERROR",
                "message": f"Lỗi: {str(e)}",
                "chat": None
            }

    @classmethod
    async def stream_join_groups(
        cls,
        client: Client,
        account: Dict[str, Any],
        master_groups: List[Dict[str, Any]],
        min_delay: float = 6.0,
        max_delay: float = 12.0
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Generator stream từng bước join nhóm kèm kiểm soát độ trễ chống ban"""
        sb = get_supabase()
        acc_id = account["id"]
        user_id = account["user_id"]
        total = len(master_groups)
        joined_count = 0
        already_count = 0
        failed_count = 0

        yield {
            "type": "start",
            "total": total,
            "account_name": account.get("account_name"),
            "phone_number": account.get("phone_number"),
            "message": f"Bắt đầu quy trình tự động tham gia {total} nhóm chung..."
        }

        for idx, grp in enumerate(master_groups):
            current_index = idx + 1
            grp_title = grp.get("group_title", "Nhóm Telegram")
            link = grp.get("invite_link", "")

            yield {
                "type": "progress",
                "current": current_index,
                "total": total,
                "group_title": grp_title,
                "stage": "joining",
                "message": f"Đang tham gia nhóm ({current_index}/{total}): {grp_title}..."
            }

            result = await cls.join_single_group(client, link, grp_title)

            # Xử lý nếu gặp FloodWait ngắn (<= 30s)
            if result.get("status") == "FLOOD_WAIT" and not result.get("stop_all"):
                wait_sec = result.get("wait_seconds", 10)
                yield {
                    "type": "progress",
                    "current": current_index,
                    "total": total,
                    "group_title": grp_title,
                    "stage": "flood_wait",
                    "message": f"Telegram yêu cầu nghỉ {wait_sec}s để chống ban. Đang chờ an toàn..."
                }
                await asyncio.sleep(wait_sec + 2)
                # Thử lại 1 lần sau khi đã chờ
                result = await cls.join_single_group(client, link, grp_title)

            # Cập nhật kết quả vào target_groups của nick này nếu thành công
            if result["success"]:
                if result["status"] == "ALREADY_JOINED":
                    already_count += 1
                else:
                    joined_count += 1

                # Nếu có thông tin chat_id mới từ Telegram, lưu vào CSDL
                chat_info = result.get("chat")
                if chat_info and sb:
                    try:
                        # Kiểm tra xem nhóm đã tồn tại trong target_groups của account này chưa
                        exist_check = sb.table("target_groups").select("id").eq("account_id", acc_id).eq("chat_id", chat_info["id"]).execute()
                        if not exist_check.data:
                            sb.table("target_groups").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "chat_id": chat_info["id"],
                                "group_title": chat_info["title"],
                                "is_active": True
                            }).execute()
                    except Exception as err:
                        print(f"⚠️ Lỗi lưu target_group vào CSDL: {err}")
            else:
                failed_count += 1

            yield {
                "type": "item_done",
                "current": current_index,
                "total": total,
                "group_title": grp_title,
                "result": result,
                "message": f"[{'✅' if result['success'] else '❌'}] {grp_title}: {result['message']}"
            }

            # Nếu gặp lỗi nguy hiểm cần dừng toàn bộ (PEER_FLOOD, MAX_LIMIT, FloodWait dài)
            if result.get("stop_all"):
                yield {
                    "type": "aborted",
                    "reason": result["message"],
                    "message": f"Dừng toàn bộ tiến trình: {result['message']}"
                }
                break

            # Độ trễ an toàn giữa 2 nhóm (nếu chưa phải nhóm cuối)
            if current_index < total:
                delay = round(random.uniform(min_delay, max_delay), 1)
                yield {
                    "type": "delay",
                    "seconds": delay,
                    "message": f"Nghỉ ngẫu nhiên {delay}s để chống ban tài khoản trước khi sang nhóm tiếp theo..."
                }
                await asyncio.sleep(delay)

        # Ghi log hoạt động
        ActivityService.log_activity(
            user_id=user_id,
            action_type="TELEGRAM",
            title=f"Auto-Join Nhóm Chung ({joined_count} nhóm mới)",
            description=f"Tài khoản {account.get('account_name', '')} đã tham gia {joined_count} nhóm mới, {already_count} nhóm có sẵn, {failed_count} thất bại.",
            metadata={
                "account_id": acc_id,
                "total": total,
                "joined": joined_count,
                "already": already_count,
                "failed": failed_count
            }
        )

        yield {
            "type": "completed",
            "total": total,
            "joined_count": joined_count,
            "already_count": already_count,
            "failed_count": failed_count,
            "message": f"Hoàn tất quy trình: Đã tham gia {joined_count} nhóm mới, {already_count} nhóm đã có sẵn!"
        }
