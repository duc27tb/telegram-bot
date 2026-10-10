import uuid
import asyncio

try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from typing import Dict, Any
from pyrogram import Client
from pyrogram.errors import (
    SessionPasswordNeeded,
    PhoneCodeInvalid,
    PhoneCodeExpired,
    PhoneNumberInvalid,
    FloodWait
)
from app.config import settings

# Lưu trữ tạm các phiên gửi OTP đang chờ nhập mã
# Format: { login_id: { "client": Client, "phone": str, "phone_code_hash": str, "api_id": int, "api_hash": str } }
pending_logins: Dict[str, Dict[str, Any]] = {}

def normalize_phone(phone: str) -> str:
    """Tự động chuẩn hóa số điện thoại: 0912345678 -> +84912345678"""
    if not phone:
        return ""
    clean = str(phone).strip().replace(" ", "").replace("-", "").replace(".", "")
    if clean.startswith("0"):
        return "+84" + clean[1:]
    elif clean.startswith("84") and not clean.startswith("+84"):
        return "+" + clean
    elif not clean.startswith("+"):
        return "+" + clean
    return clean

class OTPService:
    @staticmethod
    async def request_otp(phone: str, api_id: str = None, api_hash: str = None) -> Dict[str, Any]:
        """Gửi mã xác nhận OTP tới số điện thoại Telegram"""
        phone = normalize_phone(phone)
        if not api_id or not str(api_id).strip():
            return {
                "success": False,
                "error": "Bắt buộc phải nhập API ID riêng của bạn! Vui lòng xem hướng dẫn lấy API ID & API Hash."
            }
        if not api_hash or not str(api_hash).strip():
            return {
                "success": False,
                "error": "Bắt buộc phải nhập API Hash riêng của bạn! Vui lòng xem hướng dẫn lấy API ID & API Hash."
            }

        try:
            final_api_id = int(str(api_id).strip())
        except ValueError:
            return {
                "success": False,
                "error": "API ID không hợp lệ! API ID phải là một dãy số nguyên."
            }

        final_api_hash = str(api_hash).strip()

        # Khởi tạo client lưu trong RAM (không tạo file rác)
        temp_name = f"otp_{uuid.uuid4().hex[:8]}"
        client = Client(
            name=temp_name,
            api_id=final_api_id,
            api_hash=final_api_hash,
            in_memory=True
        )

        try:
            await client.connect()
            sent_code = await client.send_code(phone)
            login_id = str(uuid.uuid4())

            pending_logins[login_id] = {
                "client": client,
                "phone": phone,
                "phone_code_hash": sent_code.phone_code_hash,
                "api_id": final_api_id,
                "api_hash": final_api_hash
            }

            return {
                "success": True,
                "login_id": login_id,
                "message": f"Mã xác nhận đã được gửi tới Telegram của số {phone}!"
            }
        except FloodWait as e:
            await client.disconnect()
            return {"success": False, "error": f"Telegram yêu cầu chờ {e.value} giây do thao tác quá nhanh!"}
        except PhoneNumberInvalid:
            await client.disconnect()
            return {"success": False, "error": "Số điện thoại không hợp lệ hoặc chưa đăng ký Telegram!"}
        except Exception as e:
            try:
                await client.disconnect()
            except Exception:
                pass
            return {"success": False, "error": str(e)}

    @staticmethod
    async def verify_otp(login_id: str, code: str, password: str = None) -> Dict[str, Any]:
        """Xác thực mã OTP và xuất chuỗi Session String"""
        if login_id not in pending_logins:
            return {"success": False, "error": "Phiên đăng nhập đã hết hạn hoặc không tồn tại. Vui lòng gửi lại OTP!"}

        data = pending_logins[login_id]
        client: Client = data["client"]
        phone = data["phone"]
        phone_code_hash = data["phone_code_hash"]

        try:
            try:
                await client.sign_in(phone, phone_code_hash, code)
            except SessionPasswordNeeded:
                if not password:
                    return {
                        "success": False,
                        "need_2fa": True,
                        "login_id": login_id,
                        "error": "Tài khoản có bảo mật 2 lớp (2FA). Vui lòng nhập thêm mật khẩu 2FA!"
                    }
                await client.check_password(password)

            me = await client.get_me()
            session_string = await client.export_session_string()

            await client.disconnect()
            del pending_logins[login_id]

            full_name = f"{me.first_name or ''} {me.last_name or ''}".strip() or me.username or phone
            return {
                "success": True,
                "session_string": session_string,
                "phone_number": phone,
                "account_name": full_name,
                "api_id": str(data["api_id"]),
                "api_hash": data["api_hash"],
                "groups": []
            }

        except PhoneCodeInvalid:
            return {"success": False, "error": "Mã xác nhận (OTP) không đúng. Vui lòng kiểm tra lại!"}
        except PhoneCodeExpired:
            await client.disconnect()
            del pending_logins[login_id]
            return {"success": False, "error": "Mã xác nhận đã hết hạn. Vui lòng yêu cầu mã mới!"}
        except Exception as e:
            return {"success": False, "error": f"Lỗi xác thực: {str(e)}"}
