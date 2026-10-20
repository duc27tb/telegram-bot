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

def format_telegram_error_vi(err_str: str) -> str:
    """Chuyển đổi thông báo lỗi thô từ Telegram MTProto sang tiếng Việt ngắn gọn, dễ hiểu cho người dùng"""
    if not err_str:
        return "Lỗi gửi tin không xác định"

    err_upper = err_str.upper()

    # 1. Bị cấm gửi tin trong channel/supergroup (do @SpamBot hoặc Admin ban)
    if "USER_BANNED_IN_CHANNEL" in err_upper:
        return "Tài khoản bị cấm chat trong nhóm này (hoặc đang bị @SpamBot chặn)"

    # 2. Nhóm khóa chat, chỉ cho phép admin gửi
    if "CHAT_WRITE_FORBIDDEN" in err_upper:
        return "Nhóm đã khóa chat (chỉ Admin mới có quyền gửi tin)"

    # 3. Giới hạn tần suất FloodWait
    if "FLOOD_WAIT" in err_upper or "FLOODWAIT" in err_upper:
        m = re.search(r"(\d+)", err_str)
        sec = m.group(1) if m else "một lát"
        return f"Bị Telegram tạm giới hạn tần suất gửi tin (cần nghỉ {sec}s)"

    # 4. Nhóm bật chế độ gửi chậm (Slowmode)
    if "SLOWMODE_WAIT" in err_upper:
        m = re.search(r"(\d+)", err_str)
        sec = m.group(1) if m else ""
        return f"Nhóm đang bật chế độ gửi chậm Slowmode (phải đợi {sec}s)"

    # 5. Nhóm kín hoặc link hết hạn
    if "CHANNEL_PRIVATE" in err_upper or "INVITE_HASH_EXPIRED" in err_upper:
        return "Nhóm kín hoặc link hết hạn, nick chưa có quyền vào nhóm"

    # 6. Nhóm không tồn tại hoặc nick đã rời khỏi nhóm
    if "PEER_ID_INVALID" in err_upper or "CHAT_INVALID" in err_upper or "CHANNEL_INVALID" in err_upper:
        return "Nhóm không tồn tại, đã giải tán hoặc tài khoản không còn trong nhóm"

    # 7. Tài khoản bị hạn chế
    if "USER_RESTRICTED" in err_upper or "CHAT_RESTRICTED" in err_upper:
        return "Tài khoản đang bị Telegram hạn chế quyền gửi tin"

    # 8. Nội dung tin quá dài
    if "MSG_TOO_LONG" in err_upper or "MESSAGE_TOO_LONG" in err_upper:
        return "Nội dung tin nhắn vượt quá độ dài tối đa của Telegram"

    # 9. Tài khoản bị vô hiệu hóa
    if "USER_DEACTIVATED" in err_upper:
        return "Tài khoản Telegram đã bị khóa hoặc vô hiệu hóa"

    # 10. Trùng phiên
    if "AUTH_KEY_DUPLICATED" in err_upper:
        return "Trùng phiên đăng nhập (vui lòng bấm Đăng Nhập Lại)"

    # 11. Hết hạn phiên
    if "AUTH_KEY_UNREGISTERED" in err_upper or "SESSION_REVOKED" in err_upper:
        return "Phiên đăng nhập đã hết hạn trên Telegram"

    # 12. Bị người nhận chặn
    if "INPUT_USER_DEACTIVATED" in err_upper or "USER_IS_BLOCKED" in err_upper:
        return "Người nhận hoặc nhóm đã chặn tài khoản này"

    # Lược bỏ các từ khóa kỹ thuật Telegram says: [400 ...] caused by "..."
    clean = re.sub(r'Telegram says:\s*\[\d+\s+([A-Z_]+)\]\s*-\s*', '', err_str)
    clean = re.sub(r'\(caused by ".*?"\)', '', clean).strip()
    return clean or "Lỗi kết nối gửi tin Telegram"

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
        # Lưu thời gian giãn cách cập nhật động thời gian thực: { user_id: int }
        self.custom_user_delays: Dict[str, int] = {}
        # Circuit Breaker tracking theo phiên gửi tin: { user_id: { chat_id: { "banned_count": int, "forbidden": bool, "last_error": str, "last_error_at": str } } }
        self.circuit_breakers: Dict[str, Dict[int, Dict[str, Any]]] = {}
        # Cache tin nhắn vừa gửi từ Web UI để tránh ghi đúp khi đồng bộ 2 chiều: set of (target_id, text)
        self.recently_sent_replies: set = set()

    async def get_or_start_client(self, account: Dict[str, Any]) -> Optional[Client]:
        acc_id = str(account["id"])
        user_id = str(account["user_id"])
        phone = account.get("phone_number", "")
        from app.services.aes_cipher import decrypt_session_string
        session_str = decrypt_session_string(account.get("session_string", ""))
        api_id = int(account.get("api_id") or settings.DEFAULT_API_ID)
        api_hash = account.get("api_hash") or settings.DEFAULT_API_HASH

        if not session_str:
            return None

        if acc_id in self.active_clients:
            old_cli = self.active_clients[acc_id]
            if old_cli.is_connected and getattr(old_cli, "_loaded_session", "") == session_str:
                return old_cli
            try:
                if old_cli.is_connected:
                    await old_cli.stop()
            except Exception:
                pass
            del self.active_clients[acc_id]

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

        # Đăng ký listener nhận tin nhắn riêng đến từ khách hàng
        @client.on_message(filters.private & filters.incoming)
        async def on_private_message(cli: Client, message: Message):
            await self._handle_incoming_private_message(acc_id, user_id, phone, cli, message)

        # Đăng ký listener đồng bộ tin nhắn đi khi chủ nick gửi trực tiếp từ điện thoại / app Telegram (2 chiều hoàn hảo)
        @client.on_message(filters.private & filters.outgoing)
        async def on_outgoing_private_message(cli: Client, message: Message):
            await self._handle_outgoing_private_message(acc_id, user_id, phone, cli, message)

        try:
            await client.start()
            client._loaded_session = session_str
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
        if not sender:
            return

        sender_id = sender.id
        sender_name = f"{sender.first_name or ''} {sender.last_name or ''}".strip() or "Ẩn danh"
        sender_username = sender.username
        msg_text = message.text or message.caption or ""

        # 0. LỌC BỎ BOT & HỆ THỐNG: CHỈ CHO PHÉP NGƯỜI DÙNG THẬT (HUMAN USERS) VÀO LIVE CHAT
        if getattr(sender, "is_bot", False) or sender_id in [777000, 42777]:
            print(f"⏩ [LiveChat] Bỏ qua tin nhắn từ Bot / Hệ thống Telegram (ID: {sender_id}, @{sender_username})")
            return
        if sender_username and sender_username.lower().endswith("bot"):
            print(f"⏩ [LiveChat] Bỏ qua tin nhắn từ Bot username: @{sender_username}")
            return
        if sender.first_name and ("[bot]" in sender.first_name.lower() or "spambot" in sender.first_name.lower()):
            print(f"⏩ [LiveChat] Bỏ qua tin nhắn từ Bot tên: {sender.first_name}")
            return

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

        # 1. Kiểm tra nếu tin nhắn là từ Admin (Tránh lưu admin thành khách hàng mới gây rối Live Chat)
        if sender_username and admin_username and sender_username.lower() == admin_username:
            if user_tier == "VIP" and (msg_text.startswith("**") or msg_text.startswith("//")) and message.reply_to_message:
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
            # Dù là lệnh reply hay tin nhắn thường từ admin cá nhân tới bot, tuyệt đối KHÔNG lưu admin vào danh sách khách hàng
            return

        # 2. Trích xuất thông tin tệp / hình ảnh đính kèm nếu có
        media_tag = ""
        if message.photo:
            media_tag = f"<<<MEDIA:photo||photo_{message.id}.jpg||{message.photo.file_size or 0}||{message.id}>>>\n"
        elif message.document:
            fn = message.document.file_name or f"document_{message.id}"
            media_tag = f"<<<MEDIA:document||{fn}||{message.document.file_size or 0}||{message.id}>>>\n"
        elif message.video:
            fn = message.video.file_name or f"video_{message.id}.mp4"
            media_tag = f"<<<MEDIA:video||{fn}||{message.video.file_size or 0}||{message.id}>>>\n"
        elif message.animation:
            fn = message.animation.file_name or f"animation_{message.id}.mp4"
            media_tag = f"<<<MEDIA:video||{fn}||{message.animation.file_size or 0}||{message.id}>>>\n"
        elif message.video_note:
            media_tag = f"<<<MEDIA:video||video_note_{message.id}.mp4||{message.video_note.file_size or 0}||{message.id}>>>\n"
        elif message.voice:
            media_tag = f"<<<MEDIA:voice||voice_{message.id}.ogg||{message.voice.file_size or 0}||{message.id}>>>\n"
        elif message.audio:
            fn = message.audio.file_name or f"audio_{message.id}.mp3"
            media_tag = f"<<<MEDIA:audio||{fn}||{message.audio.file_size or 0}||{message.id}>>>\n"
        elif message.sticker:
            media_tag = f"<<<MEDIA:sticker||sticker_{message.id}.webp||{message.sticker.file_size or 0}||{message.id}>>>\n"

        # Nếu không có text và cũng không có media thì mới dùng fallback
        if not media_tag and not msg_text:
            if message.contact or message.location or message.poll:
                msg_text = "[Thông tin chia sẻ: Danh thiếp / Vị trí / Khảo sát]"
            else:
                msg_text = "[Phương tiện / Tệp đính kèm]"

        # Lưu tin nhắn của khách vào Supabase (Cuộc hội thoại & Nội dung chat)
        stored_content = f"{reply_quote_tag}{media_tag}{msg_text}".strip()
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
                caption_hdr = f"sđt: {phone} có tin nhắn từ {sender_name} (ID: {sender_id}){quote_line}"

                if message.photo:
                    caption = f"{caption_hdr}\n{msg_text}".strip()
                    await client.send_photo(chat_id=admin_username, photo=message.photo.file_id, caption=caption[:1024])
                elif message.document:
                    caption = f"{caption_hdr}\n{msg_text}".strip()
                    await client.send_document(chat_id=admin_username, document=message.document.file_id, caption=caption[:1024])
                elif message.video:
                    caption = f"{caption_hdr}\n{msg_text}".strip()
                    await client.send_video(chat_id=admin_username, video=message.video.file_id, caption=caption[:1024])
                elif message.voice:
                    await client.send_voice(chat_id=admin_username, voice=message.voice.file_id, caption=caption_hdr[:1024])
                else:
                    report_text = f"{caption_hdr}\nnội dung: {msg_text or '[Tin nhắn trống]'}"
                    await client.send_message(chat_id=admin_username, text=report_text)

                print(f"📲 [LiveChat] Đã forward tin nhắn tới @{admin_username}")
            except Exception as e:
                print(f"⚠️ Lỗi forward tin nhắn tới @{admin_username}: {e}")

    async def _handle_outgoing_private_message(self, account_id: str, user_id: str, phone: str, client: Client, message: Message):
        """Đồng bộ tin nhắn đi: Khi chủ tài khoản nhắn tin riêng từ app Telegram trên điện thoại/máy tính,
        lưu vào chat_messages với sender_type='admin' để hiển thị đầy đủ 2 chiều trên Web UI."""
        sb = get_supabase()
        if not sb or not message.chat:
            return

        target_chat = message.chat
        target_id = target_chat.id

        # 0. Bỏ qua nếu nhắn cho bot hoặc telegram service notification
        if target_id in [777000, 42777] or getattr(target_chat, "is_bot", False):
            return
        if target_chat.username and target_chat.username.lower().endswith("bot"):
            return

        # Bỏ qua nếu nhắn cho tài khoản admin (Tin thông báo hệ thống chuyển tiếp, không phải khách hàng)
        profile_res = sb.table("profiles").select("telegram_admin_username").eq("id", user_id).execute()
        if profile_res.data:
            admin_un = (profile_res.data[0].get("telegram_admin_username") or "").strip().lower().replace("@", "")
            if admin_un and target_chat.username and target_chat.username.lower() == admin_un:
                return

        # Bỏ qua nếu nhắn cho chính mình (Saved Messages)
        try:
            me = await client.get_me()
            if me and me.id == target_id:
                return
        except Exception:
            pass

        msg_text = message.text or message.caption or ""

        # Trích xuất thông tin nếu là tin nhắn Reply từ app Telegram trên điện thoại
        reply_quote_tag = ""
        if message.reply_to_message:
            r_msg = message.reply_to_message
            r_sender = r_msg.from_user
            r_sender_name = f"{r_sender.first_name or ''} {r_sender.last_name or ''}".strip() if r_sender else (getattr(r_msg.sender_chat, 'title', None) or "Tin nhắn trước")
            r_text = (r_msg.text or r_msg.caption or "[Hình ảnh/Tệp tin]").strip()
            if len(r_text) > 160:
                r_text = r_text[:157] + "..."
            reply_quote_tag = f"<<<REPLY:{r_sender_name}||{r_text}>>>\n"

        # Trích xuất thông tin media nếu gửi từ app Telegram
        media_tag = ""
        if message.photo:
            media_tag = f"<<<MEDIA:photo||photo_{message.id}.jpg||{message.photo.file_size or 0}||{message.id}>>>\n"
        elif message.document:
            fn = message.document.file_name or f"document_{message.id}"
            media_tag = f"<<<MEDIA:document||{fn}||{message.document.file_size or 0}||{message.id}>>>\n"
        elif message.video:
            fn = message.video.file_name or f"video_{message.id}.mp4"
            media_tag = f"<<<MEDIA:video||{fn}||{message.video.file_size or 0}||{message.id}>>>\n"
        elif message.animation:
            fn = message.animation.file_name or f"animation_{message.id}.mp4"
            media_tag = f"<<<MEDIA:video||{fn}||{message.animation.file_size or 0}||{message.id}>>>\n"
        elif message.video_note:
            media_tag = f"<<<MEDIA:video||video_note_{message.id}.mp4||{message.video_note.file_size or 0}||{message.id}>>>\n"
        elif message.voice:
            media_tag = f"<<<MEDIA:voice||voice_{message.id}.ogg||{message.voice.file_size or 0}||{message.id}>>>\n"
        elif message.audio:
            fn = message.audio.file_name or f"audio_{message.id}.mp3"
            media_tag = f"<<<MEDIA:audio||{fn}||{message.audio.file_size or 0}||{message.id}>>>\n"
        elif message.sticker:
            media_tag = f"<<<MEDIA:sticker||sticker_{message.id}.webp||{message.sticker.file_size or 0}||{message.id}>>>\n"

        stored_content = f"{reply_quote_tag}{media_tag}{msg_text}".strip()
        if not stored_content:
            if message.contact or message.location or message.poll:
                stored_content = "[Thông tin chia sẻ: Danh thiếp / Vị trí / Khảo sát]"
            else:
                stored_content = "[Phương tiện / Tệp đính kèm]"

        # Tránh ghi đúp tin nhắn nếu vừa được gửi từ Web UI
        cache_key = (target_id, msg_text.strip())
        if cache_key in self.recently_sent_replies:
            self.recently_sent_replies.discard(cache_key)
            return

        target_name = f"{target_chat.first_name or ''} {target_chat.last_name or ''}".strip() or getattr(target_chat, "title", None) or "Khách hàng"
        target_username = target_chat.username

        # Lưu vào cuộc hội thoại và bảng chat_messages với sender_type = 'admin'
        self._save_chat_message(user_id, account_id, target_id, "admin", stored_content, target_name, target_username)
        print(f"📤 [LiveChat Sync] Đã đồng bộ tin nhắn đi từ app Telegram tới khách hàng (ID: {target_id}): {msg_text[:60]}")

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
            # Đánh dấu cache để tránh ghi đúp khi on_outgoing_private_message bắt được
            self.recently_sent_replies.add((customer_sender_id, text.strip()))
            await client.send_message(chat_id=customer_sender_id, text=text)
            self._save_chat_message(user_id, account_id, customer_sender_id, "admin", text)
            return {"success": True, "message": "Đã gửi phản hồi thành công"}
        except Exception as e:
            self.recently_sent_replies.discard((customer_sender_id, text.strip()))
            return {"success": False, "error": f"Lỗi gửi tin: {str(e)}"}

    async def download_media_stream(self, account_id: str, chat_id: int, message_id: int) -> Dict[str, Any]:
        """Tải media on-demand từ Telegram MTProto và trả về binary stream cho Web UI xem trực tiếp"""
        sb = get_supabase()
        if not sb:
            return {"success": False, "error": "Chưa kết nối CSDL"}

        acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
        if not acc_res.data:
            return {"success": False, "error": "Không tìm thấy tài khoản Telegram này"}

        account = acc_res.data[0]
        client = await self.get_or_start_client(account)
        if not client:
            return {"success": False, "error": "Tài khoản Telegram hiện chưa online. Vui lòng kiểm tra lại trạng thái tài khoản!"}

        try:
            try:
                msg = await client.get_messages(chat_id=chat_id, message_ids=message_id)
            except Exception as peer_err:
                # Nếu peer chưa có trong cache SQLite MTProto, tra cứu username từ bảng customer_conversations để nạp peer
                resolved = False
                try:
                    conv_res = sb.table("customer_conversations").select("sender_username").eq("account_id", account_id).eq("sender_id", chat_id).execute()
                    if conv_res.data and conv_res.data[0].get("sender_username"):
                        target_un = conv_res.data[0]["sender_username"].replace("@", "").strip()
                        u = await client.get_users(target_un)
                        if u:
                            msg = await client.get_messages(chat_id=u.id, message_ids=message_id)
                            resolved = True
                except Exception:
                    pass

                if not resolved:
                    try:
                        async for _ in client.get_dialogs(limit=20):
                            pass
                        msg = await client.get_messages(chat_id=chat_id, message_ids=message_id)
                    except Exception:
                        return {"success": False, "error": f"Lỗi xác thực người dùng Telegram: {peer_err}"}

            if not msg:
                return {"success": False, "error": "Tin nhắn không tồn tại hoặc đã bị xóa trên Telegram"}

            mime_type = "application/octet-stream"
            filename = f"media_{message_id}"
            disposition = "inline"

            if msg.photo:
                mime_type = "image/jpeg"
                filename = f"photo_{message_id}.jpg"
                disposition = "inline"
            elif msg.document:
                mime_type = msg.document.mime_type or "application/octet-stream"
                filename = msg.document.file_name or f"document_{message_id}"
                disposition = "inline" if mime_type.startswith("image/") or mime_type == "application/pdf" else "attachment"
            elif msg.video:
                mime_type = msg.video.mime_type or "video/mp4"
                filename = msg.video.file_name or f"video_{message_id}.mp4"
                disposition = "inline"
            elif msg.animation:
                mime_type = msg.animation.mime_type or "video/mp4"
                filename = msg.animation.file_name or f"animation_{message_id}.mp4"
                disposition = "inline"
            elif msg.video_note:
                mime_type = "video/mp4"
                filename = f"video_note_{message_id}.mp4"
                disposition = "inline"
            elif msg.voice:
                mime_type = msg.voice.mime_type or "audio/ogg"
                filename = f"voice_{message_id}.ogg"
                disposition = "inline"
            elif msg.audio:
                mime_type = msg.audio.mime_type or "audio/mpeg"
                filename = msg.audio.file_name or f"audio_{message_id}.mp3"
                disposition = "inline"
            elif msg.sticker:
                mime_type = "image/webp"
                filename = f"sticker_{message_id}.webp"
                disposition = "inline"
            else:
                return {"success": False, "error": "Tin nhắn này không chứa hình ảnh hay tệp đính kèm"}

            bio = await client.download_media(msg, in_memory=True)
            if not bio:
                return {"success": False, "error": "Không thể tải tệp từ máy chủ Telegram"}

            if hasattr(bio, "getvalue"):
                data_bytes = bio.getvalue()
            else:
                bio.seek(0)
                data_bytes = bio.read()

            return {
                "success": True,
                "bytes": data_bytes,
                "mime_type": mime_type,
                "filename": filename,
                "disposition": disposition
            }
        except Exception as e:
            print(f"⚠️ [Media Stream] Lỗi tải media ({account_id}, msg {message_id}): {e}")
            return {"success": False, "error": f"Lỗi tải từ Telegram: {str(e)}"}

    async def sync_chat_history(self, account_id: str, chat_id: int, limit: int = 40) -> Dict[str, Any]:
        """Đồng bộ lịch sử trò chuyện 2 chiều từ Telegram MTProto vào CSDL Supabase"""
        sb = get_supabase()
        if not sb:
            return {"success": False, "error": "Chưa kết nối CSDL"}

        # Khóa Mutex chống đồng bộ đồng thời cho cùng một cuộc hội thoại
        if not hasattr(self, "_chat_sync_locks"):
            self._chat_sync_locks = {}
        sync_lock_key = f"{account_id}_{chat_id}"
        if sync_lock_key not in self._chat_sync_locks:
            self._chat_sync_locks[sync_lock_key] = asyncio.Lock()

        if self._chat_sync_locks[sync_lock_key].locked():
            return {"success": True, "added": 0, "status": "already_syncing"}

        async with self._chat_sync_locks[sync_lock_key]:
            acc_res = sb.table("telegram_accounts").select("*").eq("id", account_id).execute()
            if not acc_res.data:
                return {"success": False, "error": "Không tìm thấy tài khoản Telegram"}

            account = acc_res.data[0]
            user_id = account.get("user_id")
            client = await self.get_or_start_client(account)
            if not client:
                return {"success": False, "error": "Tài khoản Telegram hiện chưa online"}

            conv_res = sb.table("customer_conversations").select("*").eq("account_id", account_id).eq("sender_id", chat_id).execute()
            if not conv_res.data:
                return {"success": False, "error": "Không tìm thấy cuộc hội thoại này"}

            conv = conv_res.data[0]
            conv_id = conv["id"]

            target_peer = chat_id
            try:
                try:
                    await client.get_chat(target_peer)
                except Exception:
                    target_un = (conv.get("sender_username") or "").replace("@", "").strip()
                    if target_un:
                        u = await client.get_users(target_un)
                        target_peer = u.id
            except Exception:
                pass

            # Tự động dọn dẹp các dòng fallback cũ nếu có
            try:
                sb.table("chat_messages").delete().eq("conversation_id", conv_id).eq("content", "[Phương tiện / Tệp đính kèm]").execute()
            except Exception:
                pass

            from collections import Counter
            existing = sb.table("chat_messages").select("content, sender_type").eq("conversation_id", conv_id).execute().data or []
            existing_counts = Counter((m["content"].strip(), m["sender_type"]) for m in existing)

            all_msgs = []
            try:
                async for m in client.get_chat_history(target_peer, limit=limit):
                    all_msgs.append(m)
            except Exception as e:
                return {"success": False, "error": f"Không thể lấy tin nhắn từ Telegram: {e}"}

            all_msgs.reverse()
            added_count = 0
            last_text = ""

            for m in all_msgs:
                is_me = m.outgoing or getattr(m.from_user, "is_self", False)
                s_type = "admin" if is_me else "customer"

                media_tag = ""
                if m.photo:
                    media_tag = f"<<<MEDIA:photo||photo_{m.id}.jpg||{m.photo.file_size or 0}||{m.id}>>>\n"
                elif m.document:
                    fn = m.document.file_name or f"document_{m.id}"
                    media_tag = f"<<<MEDIA:document||{fn}||{m.document.file_size or 0}||{m.id}>>>\n"
                elif m.video:
                    fn = m.video.file_name or f"video_{m.id}.mp4"
                    media_tag = f"<<<MEDIA:video||{fn}||{m.video.file_size or 0}||{m.id}>>>\n"
                elif m.animation:
                    fn = m.animation.file_name or f"animation_{m.id}.mp4"
                    media_tag = f"<<<MEDIA:video||{fn}||{m.animation.file_size or 0}||{m.id}>>>\n"
                elif m.video_note:
                    media_tag = f"<<<MEDIA:video||video_note_{m.id}.mp4||{m.video_note.file_size or 0}||{m.id}>>>\n"
                elif m.voice:
                    media_tag = f"<<<MEDIA:voice||voice_{m.id}.ogg||{m.voice.file_size or 0}||{m.id}>>>\n"
                elif m.audio:
                    fn = m.audio.file_name or f"audio_{m.id}.mp3"
                    media_tag = f"<<<MEDIA:audio||{fn}||{m.audio.file_size or 0}||{m.id}>>>\n"
                elif m.sticker:
                    media_tag = f"<<<MEDIA:sticker||sticker_{m.id}.webp||{m.sticker.file_size or 0}||{m.id}>>>\n"

                reply_tag = ""
                if m.reply_to_message:
                    r_msg = m.reply_to_message
                    r_sender = r_msg.from_user
                    r_sender_name = f"{r_sender.first_name or ''} {r_sender.last_name or ''}".strip() if r_sender else "Tin nhắn trước"
                    r_text = (r_msg.text or r_msg.caption or "[Tệp/Ảnh]").strip()[:100]
                    reply_tag = f"<<<REPLY:{r_sender_name}||{r_text}>>>\n"

                msg_text = (m.text or m.caption or "").strip()
                if not media_tag and not msg_text:
                    continue

                stored_content = f"{reply_tag}{media_tag}{msg_text}".strip()
                last_text = stored_content

                # Bỏ qua nếu tin nhắn này đã tồn tại trong CSDL (chính xác từng tin nhắn, không loại nhầm từ ngắn)
                msg_key = (stored_content, s_type)
                if existing_counts[msg_key] > 0:
                    existing_counts[msg_key] -= 1
                    continue

                created_ts = m.date.isoformat() if hasattr(m.date, "isoformat") else "now()"
                try:
                    sb.table("chat_messages").insert({
                        "conversation_id": conv_id,
                        "user_id": user_id,
                        "sender_type": s_type,
                        "content": stored_content,
                        "created_at": created_ts
                    }).execute()
                    existing_counts[msg_key] += 1
                    added_count += 1
                except Exception as err:
                    print(f"Error inserting synced msg: {err}")

            if last_text:
                sb.table("customer_conversations").update({
                    "last_message": last_text,
                    "updated_at": "now()"
                }).eq("id", conv_id).execute()

            return {"success": True, "added": added_count, "total_scanned": len(all_msgs)}

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

        # Reset Circuit Breaker tracking khi người dùng bấm Khởi động lại (để quét lại tất cả nhóm)
        if user_id in self.circuit_breakers:
            self.circuit_breakers[user_id].clear()

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

        # Reset Circuit Breaker tracking khi tạm dừng
        if user_id in self.circuit_breakers:
            self.circuit_breakers[user_id].clear()

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

                # 4. Kiểm tra Checkpoint điểm dừng chân chu kỳ (Thuật toán Resume & Cycle TTL)
                from app.services.campaign_checkpoint import CampaignCheckpointService
                now_ts = time.time()
                cp = CampaignCheckpointService.get_checkpoint(user_id)
                sent_chat_ids: set = set()

                if cp:
                    saved_start_time = cp.get("cycle_start_time", now_ts)
                    saved_sent_ids = set(cp.get("sent_chat_ids", []))
                    time_passed = now_ts - saved_start_time

                    # Nếu thời gian từ lúc gửi nhóm 1 đã vượt quá chu kỳ cài đặt (ví dụ 2 tiếng):
                    # Tự động reset và bắt đầu chu kỳ mới toanh từ nhóm 1!
                    if time_passed >= cycle_delay:
                        print(f"🔄 [Campaign] Chu kỳ cũ đã hết hạn ({int(time_passed)}s >= {cycle_delay}s). Bắt đầu vòng mới từ nhóm 1.")
                        cycle_start_time = now_ts
                        sent_chat_ids = set()
                        CampaignCheckpointService.clear_checkpoint(user_id)
                    else:
                        # Chu kỳ cũ vẫn còn hiệu lực (chưa đủ 2 tiếng) -> Tiếp tục gửi từ nhóm dở dang!
                        cycle_start_time = saved_start_time
                        sent_chat_ids = saved_sent_ids
                        remaining_count = len([g for g in all_groups if g["chat_id"] not in sent_chat_ids])
                        print(f"⏩ [Campaign Resume] Tiếp tục chu kỳ dở dang: Đã gửi {len(sent_chat_ids)}/{len(all_groups)} nhóm ({int(time_passed)}s / {cycle_delay}s). Đang gửi tiếp {remaining_count} nhóm còn lại...")
                        sb.table("bot_logs").insert({
                            "user_id": user_id,
                            "account_id": None,
                            "log_type": "info",
                            "message": f"Tiếp tục chu kỳ dở dang: Đã gửi {len(sent_chat_ids)}/{len(all_groups)} nhóm trước đó ({int(time_passed)}s / {cycle_delay}s). Đang gửi tiếp {remaining_count} nhóm còn lại..."
                        }).execute()
                else:
                    cycle_start_time = now_ts
                    sent_chat_ids = set()

                cycle_sent_count = 0
                cycle_error_count = 0

                # 5. Phân phối nhóm & Chạy từng tài khoản Telegram
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
                        # Cơ chế bảo vệ 1: Nếu người dùng vừa bấm Dừng tài khoản này thì lập tức ngắt gửi
                        if acc_id not in self.active_clients:
                            print(f"⏹️ [Campaign] Tài khoản {phone} đã được người dùng tắt (Offline). Lập tức dừng gửi sang các nhóm tiếp theo.")
                            break

                        chat_id = grp["chat_id"]
                        g_title = grp.get("group_title") or str(chat_id)

                        # Bỏ qua nhóm đã gửi thành công trong chu kỳ hiện tại (Resume checkpoint)
                        if chat_id in sent_chat_ids:
                            continue

                        # 0. Bỏ qua nhóm rác / nhóm chat riêng dưới 5 thành viên (Tránh spam nhóm 1 người, nhóm trung gian cũ)
                        from app.services.group_link_cache import GroupLinkCache
                        cached_meta = GroupLinkCache.get_link(chat_id)
                        members_count = grp.get("members_count") or (cached_meta.get("members_count") if cached_meta else None)
                        if members_count is not None and 0 < members_count < 5:
                            print(f"⏩ [Filter Low-Member] Tự động bỏ qua nhóm '{g_title}' ({chat_id}) vì chỉ có {members_count} thành viên (< 5 người).")
                            continue

                        # Thuật toán Circuit Breaker: Tự động bỏ qua nhóm không khả dụng
                        user_cb = self.circuit_breakers.setdefault(user_id, {})
                        grp_cb = user_cb.get(chat_id, {})

                        # 1. Bỏ qua nhóm khóa chat (CHAT_WRITE_FORBIDDEN - Chỉ Admin gửi) từ chu kỳ 2 trở đi
                        if grp_cb.get("forbidden", False):
                            print(f"⏩ [Circuit Breaker] Tự động bỏ qua nhóm '{g_title}' ({chat_id}) vì nhóm đã khóa chat (chỉ Admin mới có quyền gửi).")
                            continue

                        # 2. Bỏ qua nhóm bị cấm chat (USER_BANNED_IN_CHANNEL) từ chu kỳ 3 trở đi (đã lỗi liên tiếp 2 chu kỳ)
                        if grp_cb.get("banned_count", 0) >= 2:
                            print(f"⏩ [Circuit Breaker] Tự động bỏ qua nhóm '{g_title}' ({chat_id}) vì nick đã bị cấm chat liên tiếp {grp_cb['banned_count']} chu kỳ.")
                            continue

                        try:
                            # Phân tích cú pháp Spintax ngẫu nhiên (UC-14 & NUI-02)
                            raw_template = random.choice(messages_pool)
                            final_message = parse_spintax(raw_template)

                            await client.send_message(chat_id=chat_id, text=final_message)
                            cycle_sent_count += 1
                            sent_chat_ids.add(chat_id)
                            # Cập nhật checkpoint ngay khi gửi thành công để không bao giờ bị mất dấu
                            CampaignCheckpointService.mark_group_sent(user_id, chat_id, cycle_start_time, cycle_delay)

                            # Khi gửi thành công: Xóa trạng thái lỗi khỏi Circuit Breaker
                            if user_id in self.circuit_breakers and chat_id in self.circuit_breakers[user_id]:
                                del self.circuit_breakers[user_id][chat_id]

                            # Xóa lỗi trong target_groups nếu cột tồn tại
                            try:
                                sb.table("target_groups").update({"last_error": None, "last_error_at": None}).eq("chat_id", chat_id).eq("user_id", user_id).execute()
                            except Exception:
                                pass

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
                                "message": f"[{phone}] Lỗi gửi tới nhóm '{g_title}' ---- Bị Telegram tạm giới hạn FloodWait (cần nghỉ {wait_sec}s)"
                            }).execute()
                            # Tạm dừng gửi trên tài khoản này trong chu kỳ hiện tại
                            break

                        except pyrogram_errors.ChatWriteForbidden:
                            cycle_error_count += 1
                            err_msg = "Nhóm đã khóa chat (chỉ Admin mới có quyền gửi tin)"
                            now_iso = datetime.now(timezone.utc).isoformat()

                            # Đánh dấu nhóm khóa chat: Từ chu kỳ 2 trở đi bỏ qua nhóm này luôn
                            user_cb = self.circuit_breakers.setdefault(user_id, {})
                            user_cb[chat_id] = {
                                "forbidden": True,
                                "banned_count": 0,
                                "last_error": err_msg,
                                "last_error_at": now_iso
                            }

                            try:
                                sb.table("target_groups").update({"last_error": err_msg, "last_error_at": now_iso}).eq("chat_id", chat_id).eq("user_id", user_id).execute()
                            except Exception:
                                pass

                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "warning",
                                "message": f"[{phone}] Lỗi gửi tới nhóm '{g_title}' ---- {err_msg}"
                            }).execute()

                        except Exception as e:
                            cycle_error_count += 1
                            err_str = str(e)
                            err_vi = format_telegram_error_vi(err_str)
                            now_iso = datetime.now(timezone.utc).isoformat()

                            # Kiểm tra nếu là lỗi phiên nghiêm trọng (Trùng phiên, phiên bị hủy, nick bị ban)
                            is_fatal_session = any(k in err_str for k in [
                                "AUTH_KEY_DUPLICATED", "AUTH_KEY_UNREGISTERED", "SESSION_REVOKED", "USER_DEACTIVATED", "SESSION_EXPIRED"
                            ])
                            if is_fatal_session:
                                self.last_errors[acc_id] = err_str
                                try:
                                    sb.table("telegram_accounts").update({
                                        "status": "error",
                                        "last_active": now_iso
                                    }).eq("id", acc_id).execute()
                                except Exception:
                                    pass
                                await self.stop_client(acc_id)
                                sb.table("bot_logs").insert({
                                    "user_id": user_id,
                                    "account_id": acc_id,
                                    "log_type": "error",
                                    "message": f"[{phone}] Phiên đăng nhập bị ngắt ({err_vi}). Trạng thái tài khoản đã chuyển sang Báo Lỗi, vui lòng bấm 'Đăng Nhập Lại'."
                                }).execute()
                                # Dừng gửi tiếp các nhóm khác của tài khoản này
                                break

                            user_cb = self.circuit_breakers.setdefault(user_id, {})
                            curr_stat = user_cb.get(chat_id, {"banned_count": 0, "forbidden": False})

                            err_str_upper = err_str.upper()
                            if "USER_BANNED_IN_CHANNEL" in err_str_upper:
                                curr_stat["banned_count"] = curr_stat.get("banned_count", 0) + 1
                                curr_stat["last_error"] = err_vi
                                curr_stat["last_error_at"] = now_iso
                                user_cb[chat_id] = curr_stat
                                print(f"⚠️ [Circuit Breaker] Nhóm '{g_title}' ghi nhận cấm chat lần {curr_stat['banned_count']}/2 (Chu kỳ 3 sẽ tự động bỏ qua)")
                            elif "CHAT_WRITE_FORBIDDEN" in err_str_upper or "PEER_ID_INVALID" in err_str_upper or "CHAT_INVALID" in err_str_upper or "CHANNEL_INVALID" in err_str_upper:
                                curr_stat["forbidden"] = True
                                curr_stat["last_error"] = err_vi
                                curr_stat["last_error_at"] = now_iso
                                user_cb[chat_id] = curr_stat
                                print(f"⚠️ [Circuit Breaker] Nhóm '{g_title}' khóa chat hoặc không tồn tại/đã giải tán (Chu kỳ sau sẽ tự động bỏ qua)")
                            else:
                                curr_stat["last_error"] = err_vi
                                curr_stat["last_error_at"] = now_iso
                                user_cb[chat_id] = curr_stat

                            try:
                                sb.table("target_groups").update({"last_error": err_vi, "last_error_at": now_iso}).eq("chat_id", chat_id).eq("user_id", user_id).execute()
                            except Exception:
                                pass

                            sb.table("bot_logs").insert({
                                "user_id": user_id,
                                "account_id": acc_id,
                                "log_type": "error",
                                "message": f"[{phone}] Lỗi gửi tới nhóm '{g_title}' ---- {err_vi}"
                            }).execute()

                        # Cơ chế bảo vệ 2: Giãn cách thời gian ngẫu nhiên chống khóa nick (NUI-03 Anti-Ban Jitter)
                        # Đọc thời gian giãn cách cập nhật động ngay lập tức nếu người dùng vừa thay đổi trong lúc spam
                        if idx < len(target_groups_for_acc) - 1:
                            effective_delay = self.custom_user_delays.get(user_id, group_delay)
                            jitter = random.uniform(-0.15, 0.20) * effective_delay
                            actual_delay = max(5.0, effective_delay + jitter)
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

                # Sau khi hoàn tất rải tin toàn bộ danh sách nhóm trong chu kỳ:
                # Xóa checkpoint để chu kỳ kế tiếp bắt đầu lại từ nhóm 1
                CampaignCheckpointService.clear_checkpoint(user_id)

                # Chờ đến chu kỳ phát tin tiếp theo (tính từ thời điểm gửi nhóm đầu tiên của chu kỳ)
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

