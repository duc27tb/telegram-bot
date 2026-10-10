import asyncio
import random
import time
import re
import sys
from datetime import datetime, timedelta, timezone

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from typing import Dict, Any, Optional
from pyrogram import Client, filters, errors as pyrogram_errors
from pyrogram.types import Message
from app.database import get_supabase
from app.config import settings

def parse_spintax(text: str) -> str:
    """
    Phân tích Spintax đệ quy: {Xin chào|Hello|Hi} -> chọn ngẫu nhiên một biến thể.
    Hỗ trợ lồng ghép Spintax {A|{B|C}} (UC-14 Spintax Recursive Parser).
    """
    if not text:
        return ""
    pattern = re.compile(r'\{([^{}]+)\}')
    max_iterations = 25
    iters = 0
    while iters < max_iterations:
        match = pattern.search(text)
        if not match:
            break
        choices = match.group(1).split('|')
        chosen = random.choice(choices)
        text = text[:match.start()] + chosen + text[match.end():]
        iters += 1
    return text

class PyrogramEngine:
    def __init__(self):
        # Lưu các client đang chạy: { account_id: Client }
        self.active_clients: Dict[str, Client] = {}
        # Lưu các task gửi tuần hoàn: { user_id: asyncio.Task }
        self.campaign_tasks: Dict[str, asyncio.Task] = {}
        # Metadata account: { account_id: { "user_id": str, "phone": str } }
        self.account_meta: Dict[str, Dict[str, Any]] = {}
        # Lưu nguyên nhân lỗi gần nhất khi khởi động: { account_id: str }
        self.last_errors: Dict[str, str] = {}

    async def get_or_start_client(self, account: Dict[str, Any]) -> Optional[Client]:
        acc_id = str(account["id"])
        if acc_id in self.active_clients and self.active_clients[acc_id].is_connected:
            return self.active_clients[acc_id]

        user_id = str(account["user_id"])
        phone = account.get("phone_number", "")
        from app.services.aes_cipher import decrypt_session_string
        session_str = decrypt_session_string(account.get("session_string", ""))
        api_id = int(account.get("api_id") or settings.DEFAULT_API_ID)
        api_hash = account.get("api_hash") or settings.DEFAULT_API_HASH

        if not session_str:
            return None

        client = Client(
            name=f"acc_{acc_id[:8]}",
            api_id=api_id,
            api_hash=api_hash,
            session_string=session_str,
            in_memory=True
        )

        self.account_meta[acc_id] = {
            "user_id": user_id,
            "phone": phone
        }

        # Đăng ký listener nhận tin nhắn riêng
        @client.on_message(filters.private & ~filters.me)
        async def on_private_message(cli: Client, message: Message):
            await self._handle_incoming_private_message(acc_id, user_id, phone, cli, message)

        try:
            await client.start()
            self.active_clients[acc_id] = client
            # Cập nhật trạng thái online trong DB
            sb = get_supabase()
            if sb:
                sb.table("telegram_accounts").update({
                    "status": "online",
                    "last_active": "now()"
                }).eq("id", acc_id).execute()
            return client
        except Exception as e:
            print(f"❌ Lỗi khởi động client {phone}: {e}")
            self.last_errors[acc_id] = str(e)
            sb = get_supabase()
            if sb:
                sb.table("telegram_accounts").update({
                    "status": "error",
                    "last_active": "now()"
                }).eq("id", acc_id).execute()
            return None

    async def stop_client(self, account_id: str):
        if account_id in self.active_clients:
            client = self.active_clients[account_id]
            try:
                if client.is_connected:
                    await client.stop()
            except Exception:
                pass
            del self.active_clients[account_id]
        if account_id in self.account_meta:
            del self.account_meta[account_id]

    async def start_all_clients(self):
        """Khởi động toàn bộ các tài khoản bot Telegram trong DB để sẵn sàng lắng nghe tin nhắn đến"""
        sb = get_supabase()
        if not sb:
            return
        try:
            accs = sb.table("telegram_accounts").select("*").neq("status", "offline").execute().data
            if not accs:
                print("ℹ️ [PyrogramEngine] Chưa có tài khoản bot Telegram nào đang hoạt động trong hệ thống.")
                return
            print(f"🚀 [PyrogramEngine] Bắt đầu kết nối {len(accs)} tài khoản bot Telegram MTProto...")
            for acc in accs:
                try:
                    client = await self.get_or_start_client(acc)
                    if client and client.is_connected:
                        me = await client.get_me()
                        print(f"   ✅ Bot kết nối thành công: {acc.get('phone_number')} | @{me.username or 'Không username'} (ID: {me.id})")
                except Exception as err:
                    print(f"   ⚠️ Lỗi kết nối bot {acc.get('phone_number')}: {err}")
        except Exception as e:
            print(f"❌ [PyrogramEngine] Lỗi start_all_clients: {e}")

    async def _handle_incoming_private_message(self, account_id: str, user_id: str, phone: str, client: Client, message: Message):
        """Xử lý tin nhắn đến: Lưu vào Supabase và chuyển tiếp cho Admin nếu cần"""
        sb = get_supabase()
        if not sb:
            return

        sender = message.from_user
        sender_id = sender.id if sender else 0
        sender_name = f"{sender.first_name or ''} {sender.last_name or ''}".strip() if sender else "Ẩn danh"
        sender_username = sender.username if sender else None
        msg_text = message.text or message.caption or "[Phương tiện / Tệp đính kèm]"

        # Trích xuất thông tin nếu là tin nhắn Reply (trả lời tin nhắn khác)
        reply_quote_tag = ""
        reply_quote_text = ""
        if message.reply_to_message:
            r_msg = message.reply_to_message
            r_sender = r_msg.from_user
            r_sender_name = f"{r_sender.first_name or ''} {r_sender.last_name or ''}".strip() if r_sender else (getattr(r_msg.sender_chat, 'title', None) or "Tin nhắn trước")
            r_text = (r_msg.text or r_msg.caption or "[Hình ảnh/Tệp tin]").strip()
            if len(r_text) > 160:
                r_text = r_text[:157] + "..."
            reply_quote_tag = f"<<<REPLY:{r_sender_name}||{r_text}>>>\n"
            reply_quote_text = f" (↳ Trả lời [{r_sender_name}]: \"{r_text}\")"

        print(f"📩 [LiveChat] Nhận tin nhắn mới từ {sender_name} (@{sender_username or 'none'}, ID: {sender_id}) gửi tới bot {phone}{reply_quote_text}: {msg_text}")

        # Lấy thông tin cấu hình admin & gói cước của user này
        profile_res = sb.table("profiles").select("telegram_admin_username").eq("id", user_id).execute()
        admin_username = ""
        if profile_res.data:
            admin_username = (profile_res.data[0].get("telegram_admin_username") or "").strip().lower().replace("@", "")
        
        from app.services.wallet_store import LocalWalletStore
        user_tier = LocalWalletStore.get_subscription_tier(user_id)

        # 1. Kiểm tra nếu tin nhắn là từ Admin reply ngược lại cú pháp ** (ĐẶC QUYỀN VIP)
        if user_tier == "VIP" and sender_username and admin_username and sender_username.lower() == admin_username:
            if msg_text.startswith("**") and message.reply_to_message:
                reply_orig = message.reply_to_message.text or message.reply_to_message.caption or ""
                match = re.search(r"\(ID:\s*(\d+)\)", reply_orig)
                if match:
                    target_id = int(match.group(1))
                    reply_to_send = msg_text[2:].lstrip()
                    try:
                        await client.send_message(chat_id=target_id, text=reply_to_send)
                        await message.reply_text("✅ Đã chuyển tiếp tin nhắn phản hồi tới khách hàng thành công.")
                        # Lưu tin nhắn admin vào bảng chat_messages
                        self._save_chat_message(user_id, account_id, target_id, "admin", reply_to_send)
                        print(f"✅ [LiveChat] Đã chuyển tiếp phản hồi từ Admin tới ID {target_id}")
                    except Exception as err:
                        await message.reply_text(f"❌ Gửi thất bại: {err}")
                return

        # 2. Lưu tin nhắn của khách vào Supabase (Cuộc hội thoại & Nội dung chat)
        stored_content = f"{reply_quote_tag}{msg_text}"
        conv_id = self._save_chat_message(user_id, account_id, sender_id, "customer", stored_content, sender_name, sender_username)
        print(f"💾 [LiveChat] Đã lưu cuộc hội thoại (ID: {conv_id}) vào Supabase!")

        # 3. Chuyển tiếp tới Telegram Admin nếu cấu hình bật VÀ LÀ GÓI VIP (Gói Free không hỗ trợ chuyển tiếp cá nhân)
        camp_res = sb.table("campaign_settings").select("forward_to_telegram").eq("user_id", user_id).execute()
        forward_enabled = True
        if camp_res.data:
            forward_enabled = camp_res.data[0].get("forward_to_telegram", True)

        # Tránh tự forward cho chính mình nếu sender chính là admin
        is_sender_admin = sender_username and admin_username and sender_username.lower() == admin_username

        if user_tier == "VIP" and forward_enabled and admin_username and not is_sender_admin:
            try:
                quote_line = f"\n↳ Trả lời tin nhắn: \"{r_text}\"" if message.reply_to_message else ""
                report_text = (
                    f"sđt: {phone} có tin nhắn từ người dùng: {sender_name} (ID: {sender_id}){quote_line}\n"
                    f"nội dung: {msg_text}"
                )
                await client.send_message(chat_id=admin_username, text=report_text)
                print(f"📲 [LiveChat] Đã forward tin nhắn tới @{admin_username}")
            except Exception as e:
                print(f"⚠️ Lỗi forward tin nhắn tới @{admin_username}: {e}")

    def _save_chat_message(self, user_id: str, account_id: str, sender_id: int, sender_type: str, content: str, sender_name: str = None, sender_username: str = None) -> Optional[str]:
        sb = get_supabase()
        if not sb or not sender_id:
            return None
        try:
            # Tìm hoặc tạo cuộc hội thoại
            conv_res = sb.table("customer_conversations").select("id, unread_count").eq("account_id", account_id).eq("sender_id", sender_id).execute()
            if conv_res.data:
                conv_id = conv_res.data[0]["id"]
                curr_unread = conv_res.data[0].get("unread_count") or 0
                new_unread = (curr_unread + 1) if sender_type == "customer" else 0
                sb.table("customer_conversations").update({
                    "last_message": content,
                    "updated_at": "now()",
                    "unread_count": new_unread
                }).eq("id", conv_id).execute()
            else:
                new_conv = sb.table("customer_conversations").insert({
                    "user_id": user_id,
                    "account_id": account_id,
                    "sender_id": sender_id,
                    "sender_name": sender_name or "Khách hàng",
                    "sender_username": sender_username,
                    "last_message": content,
                    "unread_count": 1 if sender_type == "customer" else 0
                }).execute()
                conv_id = new_conv.data[0]["id"]

            # Thêm tin nhắn
            sb.table("chat_messages").insert({
                "conversation_id": conv_id,
                "user_id": user_id,
                "sender_type": sender_type,
                "content": content
            }).execute()
            return conv_id
        except Exception as e:
            print(f"⚠️ Lỗi lưu chat vào Supabase: {e}")
            return None

    async def send_customer_reply(self, account_id: str, customer_sender_id: int, text: str, user_id: str) -> Dict[str, Any]:
        """Gửi phản hồi trực tiếp cho khách hàng từ giao diện Web UI"""
        sb = get_supabase()
        acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
        if not acc_res.data:
            return {"success": False, "error": "Không tìm thấy tài khoản Telegram này"}

        account = acc_res.data[0]
        client = await self.get_or_start_client(account)
        if not client:
            return {"success": False, "error": "Không thể kết nối với tài khoản Telegram"}

        try:
            await client.send_message(chat_id=customer_sender_id, text=text)
            self._save_chat_message(user_id, account_id, customer_sender_id, "admin", text)
            return {"success": True, "message": "Đã gửi phản hồi thành công"}
        except Exception as e:
            return {"success": False, "error": f"Lỗi gửi tin: {str(e)}"}

    def _purge_old_bot_logs(self, user_id: str):
        """Tự động xóa nhật ký bot_logs quá 1 tiếng (TTL = 1 hour) để hệ thống luôn nhẹ và tải tức thì"""
        try:
            sb = get_supabase()
            if sb:
                one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
                sb.table("bot_logs").delete().eq("user_id", user_id).lt("created_at", one_hour_ago).execute()
        except Exception as e:
            print(f"[Campaign] Purge old logs error: {e}")

    async def start_campaign_for_user(self, user_id: str) -> Dict[str, Any]:
        """Khởi động chiến dịch rải tin cho toàn bộ tài khoản của một người dùng (UC-14)"""
        sb = get_supabase()
        if not sb:
            return {"success": False, "error": "Chưa kết nối Supabase"}

        # Hủy task cũ nếu đang chạy
        if user_id in self.campaign_tasks and not self.campaign_tasks[user_id].done():
            self.campaign_tasks[user_id].cancel()

        # Đảm bảo cài đặt chiến dịch tồn tại trong DB
        try:
            camp_check = sb.table("campaign_settings").select("id").eq("user_id", user_id).execute()
            if not camp_check.data:
                sb.table("campaign_settings").insert({
                    "user_id": user_id,
                    "is_running": True,
                    "group_delay_seconds": 120,
                    "cycle_delay_seconds": 1200,
                    "forward_to_telegram": False
                }).execute()
            else:
                sb.table("campaign_settings").update({"is_running": True}).eq("user_id", user_id).execute()
        except Exception as e:
            print(f"[start_campaign] Error updating campaign_settings: {e}")

        # Tự động dọn dẹp log quá 1 tiếng
        self._purge_old_bot_logs(user_id)

        # Tạo background task chạy chu kỳ rải tin
        task = asyncio.create_task(self._campaign_worker_loop(user_id))
        self.campaign_tasks[user_id] = task

        # Ghi log bắt đầu
        try:
            sb.table("bot_logs").insert({
                "user_id": user_id,
                "account_id": None,
                "log_type": "info",
                "message": "Chiến dịch rải tin tự động đa tài khoản đã được KHỞI ĐỘNG."
            }).execute()
        except Exception:
            pass

        return {"success": True, "message": "Đã khởi động chiến dịch rải tin thành công!"}

    async def stop_campaign_for_user(self, user_id: str) -> Dict[str, Any]:
        """Tạm dừng chiến dịch rải tin của người dùng"""
        sb = get_supabase()
        if sb:
            try:
                sb.table("campaign_settings").update({"is_running": False}).eq("user_id", user_id).execute()
            except Exception:
                pass

        if user_id in self.campaign_tasks:
            self.campaign_tasks[user_id].cancel()
            del self.campaign_tasks[user_id]

        if sb:
            try:
                sb.table("bot_logs").insert({
                    "user_id": user_id,
                    "account_id": None,
                    "log_type": "info",
                    "message": "Chiến dịch rải tin đã TẠM DỪNG theo yêu cầu người dùng."
                }).execute()
            except Exception:
                pass

        return {"success": True, "message": "Đã dừng chiến dịch thành công!"}

    async def _campaign_worker_loop(self, user_id: str):
        """Vòng lặp gửi tin tuần hoàn độc lập đa tài khoản (UC-14 Multi-Account Engine)"""
        sb = get_supabase()
        print(f"🚀 [Campaign] Bắt đầu tiến trình gửi tin tuần hoàn cho User: {user_id}")

        while True:
            try:
                # Tự động dọn dẹp log quá 1 tiếng để đảm bảo DB luôn siêu nhẹ và nhanh
                self._purge_old_bot_logs(user_id)

                # 1. Đọc cấu hình chiến dịch
                camp_res = sb.table("campaign_settings").select("*").eq("user_id", user_id).execute()
                if not camp_res.data or not camp_res.data[0].get("is_running", False):
                    print(f"⏹️ [Campaign] User {user_id} đã dừng chiến dịch.")
                    break

                settings = camp_res.data[0]
                group_delay = max(5, settings.get("group_delay_seconds", 120))
                cycle_delay = max(30, settings.get("cycle_delay_seconds", 1200))

                # 2. Đọc kho mẫu tin nhắn (Spintax)
                tmpl_res = sb.table("message_templates").select("content").eq("user_id", user_id).eq("is_active", True).execute()
                messages_pool = [t["content"] for t in tmpl_res.data] if tmpl_res.data else []

                # Kiểm tra hạn mức gói cước Free vs VIP
                from app.services.wallet_store import LocalWalletStore
                u_tier = LocalWalletStore.get_subscription_tier(user_id)
                if u_tier != "VIP" and len(messages_pool) > 1:
                    messages_pool = messages_pool[:1]

                # Kiểm tra hạn mức phát tin 50 tin/ngày cho gói Free
                if u_tier != "VIP":
                    today_iso = datetime.utcnow().date().isoformat() + "T00:00:00Z"
                    try:
                        sent_today_res = sb.table("bot_logs").select("id", count="exact").eq("user_id", user_id).eq("log_type", "sent").gte("created_at", today_iso).execute()
                        sent_today_count = sent_today_res.count if hasattr(sent_today_res, "count") and sent_today_res.count is not None else len(sent_today_res.data or [])
                    except Exception:
                        sent_today_count = 0

                    if sent_today_count >= 50:
                        print(f"⚠️ [Campaign] User {user_id} (Gói Free) đã đạt hạn mức 50 tin/ngày ({sent_today_count}/50). Tạm dừng 10 phút...")
                        sb.table("bot_logs").insert({
                            "user_id": user_id,
                            "account_id": None,
                            "log_type": "warning",
                            "message": f"Tài khoản Gói Miễn Phí (Free) đã gửi tối đa 50 tin/ngày ({sent_today_count}/50). Nâng cấp VIP Pro để gửi tin không giới hạn!"
                        }).execute()
                        await asyncio.sleep(600)
                        continue

                # 3. Đọc danh sách tài khoản Telegram kết nối (Chỉ lấy tài khoản đang BẬT, bỏ qua các nick đã ấn Dừng / offline)
                accs_res = sb.table("telegram_accounts").select("*").eq("user_id", user_id).neq("status", "offline").execute()
                accounts = accs_res.data if accs_res.data else []

                # Đọc danh sách nhóm mục tiêu
                groups_res = sb.table("target_groups").select("id, chat_id, group_title, account_id").eq("user_id", user_id).eq("is_active", True).execute()
                all_groups = groups_res.data if groups_res.data else []

                if not messages_pool:
                    print(f"⚠️ [Campaign] User {user_id} chưa có tin nhắn mẫu. Nghỉ 30s...")
                    await asyncio.sleep(30)
                    continue

                if not accounts:
                    print(f"⚠️ [Campaign] User {user_id} không có tài khoản Telegram nào đang hoạt động (tất cả đang Tạm dừng). Nghỉ 30s...")
                    sb.table("bot_logs").insert({
                        "user_id": user_id,
                        "account_id": None,
                        "log_type": "warning",
                        "message": "Chiến dịch tạm hoãn do toàn bộ tài khoản Telegram của bạn đang ở trạng thái TẠM DỪNG (Offline)."
                    }).execute()
                    await asyncio.sleep(30)
                    continue

                if not all_groups:
                    print(f"⚠️ [Campaign] User {user_id} chưa có nhóm mục tiêu nào. Nghỉ 30s...")
                    await asyncio.sleep(30)
                    continue

                cycle_start_time = time.time()
                cycle_sent_count = 0
                cycle_error_count = 0

                # 4. Phân phối nhóm & Chạy từng tài khoản Telegram
                for acc_idx, acc in enumerate(accounts):
                    acc_id = acc["id"]
                    phone = acc.get("phone_number", "Unknown")

                    # Phân bổ nhóm thông minh (Tài khoản nào có nhóm riêng gửi nhóm đó, nhóm chung chia đều round-robin)
                    acc_groups = [g for g in all_groups if g.get("account_id") == acc_id]
                    shared_groups = [g for g in all_groups if not g.get("account_id")]

                    if acc_groups:
                        target_groups_for_acc = acc_groups
                    elif shared_groups:
                        # Chia đều nhóm chung cho các tài khoản
                        target_groups_for_acc = [g for idx, g in enumerate(shared_groups) if idx % len(accounts) == acc_idx] or shared_groups
                    else:
                        continue

                    if not target_groups_for_acc:
                        continue

                    client = await self.get_or_start_client(acc)
                    if not client:
                        print(f"⚠️ [Campaign] Không thể kết nối client cho tài khoản {phone}")
                        continue

                    for idx, grp in enumerate(target_groups_for_acc):
                        chat_id = grp["chat_id"]
                        g_title = grp.get("group_title") or str(chat_id)

                        try:
                            # Phân tích cú pháp Spintax ngẫu nhiên (UC-14 & NUI-02)
                            raw_template = random.choice(messages_pool)
                            final_message = parse_spintax(raw_template)

                            await client.send_message(chat_id=chat_id, text=final_message)
                            cycle_sent_count += 1

                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "sent",
                                "message": f"[{phone}] Đã gửi thành công tới nhóm: {g_title}"
                            }).execute()

                        except pyrogram_errors.FloodWait as fw:
                            cycle_error_count += 1
                            wait_sec = fw.value
                            print(f"⚠️ [Campaign] Tài khoản {phone} bị Telegram tạm hoãn FloodWait ({wait_sec}s)")
                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "warning",
                                "message": f"Tài khoản {phone} bị Telegram giới hạn FloodWait {wait_sec}s. Tự động chuyển tài khoản tiếp theo..."
                            }).execute()
                            # Tạm dừng gửi trên tài khoản này trong chu kỳ hiện tại
                            break

                        except pyrogram_errors.ChatWriteForbidden:
                            cycle_error_count += 1
                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "warning",
                                "message": f"[{phone}] Nhóm '{g_title}' đã tắt quyền gửi tin nhắn của thành viên."
                            }).execute()

                        except Exception as e:
                            cycle_error_count += 1
                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "error",
                                "message": f"[{phone}] Lỗi gửi tới nhóm '{g_title}': {str(e)}"
                            }).execute()

                        # Giãn cách thời gian ngẫu nhiên chống khóa nick (NUI-03 Anti-Ban Jitter)
                        if idx < len(target_groups_for_acc) - 1:
                            jitter = random.uniform(-0.15, 0.20) * group_delay
                            actual_delay = max(5.0, group_delay + jitter)
                            await asyncio.sleep(actual_delay)

                # Báo cáo hoàn tất chu kỳ qua Telegram Alert
                try:
                    from app.services.telegram_alert_service import TelegramAlertService
                    await TelegramAlertService.notify_campaign_summary(
                        user_id=user_id,
                        sent_count=cycle_sent_count,
                        error_count=cycle_error_count,
                        status=f"Đã rải xong chu kỳ cho {len(accounts)} tài khoản"
                    )
                except Exception:
                    pass

                # Ghi nhận kết quả chu kỳ vào bot_logs cho UI hiển thị trực tiếp
                try:
                    sb.table("bot_logs").insert({
                        "user_id": user_id,
                        "account_id": None,
                        "log_type": "info",
                        "message": f"Hoàn tất chu kỳ phát tin: {cycle_sent_count} thành công, {cycle_error_count} cảnh báo/lỗi. Nghỉ {cycle_delay}s trước đợt tiếp theo."
                    }).execute()
                except Exception:
                    pass

                # Chờ đến chu kỳ phát tin tiếp theo
                elapsed = time.time() - cycle_start_time
                if elapsed < cycle_delay:
                    await asyncio.sleep(cycle_delay - elapsed)

            except asyncio.CancelledError:
                print(f"🛑 [Campaign] Task gửi tin của User {user_id} đã bị hủy.")
                break
            except Exception as e:
                print(f"❌ [Campaign] Lỗi ngoại lệ vòng lặp gửi tin: {e}")
                await asyncio.sleep(60)

bot_engine = PyrogramEngine()

