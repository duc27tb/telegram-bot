import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# Khởi tạo Secret Key 256-bit (32 bytes)
# Ưu tiên lấy từ biến môi trường AES_SECRET_KEY / SESSION_ENCRYPTION_KEY,
# nếu chưa cấu hình thì sinh từ SUPABASE_SERVICE_KEY để đảm bảo ổn định và an toàn.
def _get_encryption_key() -> bytes:
    raw_key = os.getenv("AES_SECRET_KEY") or os.getenv("SESSION_ENCRYPTION_KEY")
    if not raw_key:
        salt = os.getenv("SUPABASE_SERVICE_KEY", "telepulse_aes256_master_key_default")
        return hashlib.sha256(salt.encode("utf-8")).digest()
    
    # Nếu key là chuỗi hex hoặc base64 hoặc chuỗi thường, chuẩn hóa về đúng 32 bytes
    if len(raw_key) == 64:
        try:
            return bytes.fromhex(raw_key)
        except ValueError:
            pass
    return hashlib.sha256(raw_key.encode("utf-8")).digest()

_CIPHER_KEY = _get_encryption_key()
_AES_PREFIX = "aes256:"

def encrypt_session_string(plain_text: Optional[str]) -> str:
    """
    Mã hóa chuỗi session Telegram bằng chuẩn AES-256-GCM (Authenticated Encryption).
    Định dạng đầu ra: 'aes256:' + base64(nonce_12bytes + ciphertext_with_tag)
    """
    if not plain_text:
        return ""
    
    # Nếu đã được mã hóa trước đó, giữ nguyên
    if plain_text.startswith(_AES_PREFIX):
        return plain_text
    
    try:
        aesgcm = AESGCM(_CIPHER_KEY)
        nonce = os.urandom(12)  # 96-bit nonce chuẩn cho GCM
        data = plain_text.encode("utf-8")
        ciphertext = aesgcm.encrypt(nonce, data, None)
        encoded = base64.b64encode(nonce + ciphertext).decode("utf-8")
        return f"{_AES_PREFIX}{encoded}"
    except Exception as e:
        print(f"❌ [AESCipher] Lỗi mã hóa session: {e}")
        return plain_text

def decrypt_session_string(encrypted_text: Optional[str]) -> str:
    """
    Giải mã chuỗi session Telegram.
    Hỗ trợ tương thích ngược 100%: nếu chuỗi chưa mã hóa (không có prefix aes256:), trả về trực tiếp.
    """
    if not encrypted_text:
        return ""
    
    # Tương thích ngược: nếu không có prefix 'aes256:', đây là session thô cũ
    if not encrypted_text.startswith(_AES_PREFIX):
        return encrypted_text
    
    try:
        raw_b64 = encrypted_text[len(_AES_PREFIX):]
        payload = base64.b64decode(raw_b64)
        if len(payload) < 28: # 12 bytes nonce + 16 bytes tag tối thiểu
            print("⚠️ [AESCipher] Payload quá ngắn để giải mã")
            return encrypted_text
        
        nonce = payload[:12]
        ciphertext = payload[12:]
        aesgcm = AESGCM(_CIPHER_KEY)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        print(f"❌ [AESCipher] Lỗi giải mã session (sử dụng fallback): {e}")
        return encrypted_text
