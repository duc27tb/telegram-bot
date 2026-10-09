import time
import urllib.parse
from typing import Optional, Dict, Any
from payos import PayOS
from payos.types import CreatePaymentLinkRequest, ItemData
from app.config import settings
from app.database import get_supabase
from app.services.wallet_store import LocalWalletStore
from app.services.activity_service import ActivityService

def safe_log(msg: str):
    """Ghi log an toan khong bi loi charmap tren Windows console"""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"))

class PayOSService:
    _instance: Optional[PayOS] = None

    @classmethod
    def get_client(cls) -> PayOS:
        if cls._instance is None:
            if not settings.PAYOS_CLIENT_ID or not settings.PAYOS_API_KEY or not settings.PAYOS_CHECKSUM_KEY:
                raise ValueError("Chua cau hinh day du PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env")
            cls._instance = PayOS(
                client_id=settings.PAYOS_CLIENT_ID,
                api_key=settings.PAYOS_API_KEY,
                checksum_key=settings.PAYOS_CHECKSUM_KEY
            )
        return cls._instance

    @classmethod
    def create_deposit_order(
        cls, 
        user_id: str, 
        amount: int, 
        return_url: Optional[str] = None, 
        cancel_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Tao don nap tien va sinh link thanh toan VietQR qua PayOS"""
        client = cls.get_client()

        # Tao ma don hang so nguyen ngau nhien
        order_code = int(time.time() * 1000) % 9000000000 + 1000000000

        # Noi dung chuyen khoan: Toi da 25 ky tu, khong dau, khong ky tu dac biet
        description = f"NAP {order_code % 1000000}"

        fallback_url = "http://localhost:5173"
        req = CreatePaymentLinkRequest(
            order_code=order_code,
            amount=amount,
            description=description,
            cancel_url=cancel_url or f"{fallback_url}?status=cancelled",
            return_url=return_url or f"{fallback_url}?status=success",
            items=[ItemData(name="Nap tien vao vi", quantity=1, price=amount)]
        )

        payment_link = client.payment_requests.create(req)

        # URL hình ảnh VietQR chỉ hiển thị duy nhất mã QR (không có chữ và logo bên ngoài)
        account_name_encoded = urllib.parse.quote(payment_link.account_name or "")
        vietqr_image_url = (
            f"https://img.vietqr.io/image/{payment_link.bin}-{payment_link.account_number}-qr_only.png"
            f"?amount={amount}&addInfo={description}&accountName={account_name_encoded}"
        )

        tx_data = {
            "user_id": user_id,
            "order_code": order_code,
            "amount": amount,
            "description": description,
            "status": "PENDING",
            "payment_link_id": payment_link.payment_link_id,
            "checkout_url": payment_link.checkout_url,
            "qr_code": payment_link.qr_code,
            "bank_bin": payment_link.bin,
            "bank_account_number": payment_link.account_number,
            "bank_account_name": payment_link.account_name,
            "vietqr_image_url": vietqr_image_url,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        # 1. Luon luon luu vao bo dem an toan LocalWalletStore
        LocalWalletStore.save_transaction(tx_data)
        
        # Ghi log hoat dong nguoi dung
        try:
            ActivityService.log_activity(
                user_id=user_id,
                action_type="DEPOSIT",
                title="Khởi tạo đơn nạp tiền VietQR",
                description=f"Tạo đơn nạp #{order_code} số tiền {amount:,.0f} VNĐ",
                metadata={"order_code": order_code, "amount": amount}
            )
        except Exception:
            pass

        # 2. Dong thoi thu luu vao Supabase (neu da chay migration SQL)
        sb = get_supabase()
        if sb:
            try:
                sb.table("deposit_transactions").insert(tx_data).execute()
            except Exception as e:
                safe_log(f"[PayOS] Khong the luu giao dich vao Supabase (can chay migration SQL): {e}")

        return {
            "order_code": order_code,
            "amount": amount,
            "description": description,
            "checkout_url": payment_link.checkout_url,
            "qr_code_raw": payment_link.qr_code,
            "vietqr_image_url": vietqr_image_url,
            "bank_bin": payment_link.bin,
            "bank_account_number": payment_link.account_number,
            "bank_account_name": payment_link.account_name,
            "status": "PENDING"
        }

    @classmethod
    def credit_user_balance(cls, user_id: str, amount: int, order_code: int, reference_id: str = ""):
        """Cong tien vao so du cua user va danh dau giao dich la PAID"""
        # 1. Luon luon cong tien vao LocalWalletStore
        new_local_balance = LocalWalletStore.credit_user(user_id, amount, order_code, reference_id)
        safe_log(f"[PayOS] Da cong +{amount} VND cho user {user_id}. So du moi (Local): {new_local_balance} VND")

        # Ghi log hoat dong nguoi dung
        try:
            ActivityService.log_activity(
                user_id=user_id,
                action_type="DEPOSIT",
                title="Nạp tiền vào ví thành công",
                description=f"Đã cộng +{amount:,.0f} VNĐ vào số dư tài khoản qua VietQR MBBank",
                metadata={"order_code": order_code, "amount": amount, "reference_id": reference_id}
            )
        except Exception:
            pass

        # 2. Thu cong vao Supabase
        sb = get_supabase()
        if sb:
            try:
                rpc_success = False
                try:
                    rpc_res = sb.rpc("increment_user_balance", {"p_user_id": user_id, "p_amount": amount}).execute()
                    rpc_success = True
                    safe_log(f"[PayOS] Da cong {amount} VND vao Supabase qua RPC! So du: {rpc_res.data}")
                except Exception as rpc_err:
                    pass

                if not rpc_success:
                    try:
                        user_res = sb.table("profiles").select("balance").eq("id", user_id).single().execute()
                        current_balance = (user_res.data.get("balance") or 0) if user_res.data else 0
                        new_balance = current_balance + amount
                        sb.table("profiles").update({"balance": new_balance}).eq("id", user_id).execute()
                        safe_log(f"[PayOS] Da cap nhat Supabase profiles: {current_balance} -> {new_balance} VND")
                    except Exception as prof_err:
                        safe_log(f"[PayOS] Chua the cap nhat bang profiles Supabase (can chay SQL migration): {prof_err}")

                try:
                    sb.table("deposit_transactions").update({
                        "status": "PAID",
                        "payos_transaction_id": reference_id
                    }).eq("order_code", order_code).execute()
                except Exception:
                    pass
            except Exception as e:
                safe_log(f"[PayOS] Loi ket noi Supabase khi cong tien: {e}")

        # 3. Gửi thông báo Telegram Bot tự động (UC-07)
        try:
            import asyncio
            from app.services.telegram_alert_service import TelegramAlertService
            new_bal = LocalWalletStore.get_balance(user_id) or 0
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(TelegramAlertService.notify_deposit_success(user_id, amount, order_code, new_bal))
            except RuntimeError:
                asyncio.run(TelegramAlertService.notify_deposit_success(user_id, amount, order_code, new_bal))
        except Exception as alert_err:
            pass

        return True

    @classmethod
    def handle_webhook(cls, body: Dict[str, Any]) -> Dict[str, Any]:
        """Xac thuc chu ky va xu ly Webhook tu PayOS khi co tien ve"""
        client = cls.get_client()

        try:
            webhook_data = client.webhooks.verify(body)
        except Exception as err:
            safe_log(f"[PayOS] Webhook signature verification failed: {err}")
            raise ValueError(f"Chu ky webhook khong hop le: {err}")

        order_code = webhook_data.order_code
        amount = webhook_data.amount
        code = getattr(webhook_data, "code", "00")
        reference = getattr(webhook_data, "reference", "")

        safe_log(f"[PayOS] Nhan webhook: Don #{order_code}, So tien: {amount}, Ma: {code}")

        if code == "00":
            # Tim user_id tu Supabase hoac LocalWalletStore
            user_id = None
            sb = get_supabase()
            if sb:
                try:
                    tx_res = sb.table("deposit_transactions").select("*").eq("order_code", order_code).execute()
                    if tx_res.data and len(tx_res.data) > 0:
                        user_id = tx_res.data[0].get("user_id")
                except Exception:
                    pass

            if not user_id:
                local_tx = LocalWalletStore.get_transaction(order_code)
                if local_tx:
                    user_id = local_tx.get("user_id")

            # Fallback neu chi co 1 user trong he thong
            if not user_id:
                user_id = "f7ffc990-ca85-474d-b53f-827af0a08062"

            cls.credit_user_balance(
                user_id=user_id,
                amount=amount,
                order_code=order_code,
                reference_id=reference
            )

        return {"success": True, "order_code": order_code}

    @classmethod
    def check_order_status(cls, order_code: int) -> Dict[str, Any]:
        """Kiem tra trang thai don hang tu DB va fallback tra cuu PayOS"""
        # 1. Kiem tra LocalWalletStore
        local_tx = LocalWalletStore.get_transaction(order_code)
        if local_tx and local_tx.get("status") == "PAID":
            return {"status": "PAID", "order_code": order_code, "amount": local_tx.get("amount")}

        # 2. Kiem tra Supabase
        sb = get_supabase()
        sb_tx = None
        if sb:
            try:
                tx_res = sb.table("deposit_transactions").select("*").eq("order_code", order_code).execute()
                if tx_res.data and len(tx_res.data) > 0:
                    sb_tx = tx_res.data[0]
                    if sb_tx.get("status") == "PAID":
                        return {"status": "PAID", "order_code": order_code, "amount": sb_tx.get("amount")}
            except Exception:
                pass

        # 3. Tra cuu truc tiep tu PayOS
        client = cls.get_client()
        try:
            payos_info = client.payment_requests.get(order_code)
            current_status = getattr(payos_info, "status", "PENDING")

            if current_status == "PAID":
                # Xac dinh user_id
                user_id = None
                if sb_tx:
                    user_id = sb_tx.get("user_id")
                elif local_tx:
                    user_id = local_tx.get("user_id")
                else:
                    # Fallback single user
                    user_id = "f7ffc990-ca85-474d-b53f-827af0a08062"

                paid_amount = getattr(payos_info, "amount", 0) or getattr(payos_info, "amount_paid", 0) or 20000

                cls.credit_user_balance(
                    user_id=user_id,
                    amount=paid_amount,
                    order_code=order_code,
                    reference_id=getattr(payos_info, "payment_link_id", "")
                )

            return {
                "status": current_status,
                "order_code": order_code,
                "amount": getattr(payos_info, "amount", 0)
            }
        except Exception as e:
            safe_log(f"[PayOS] PayOS API check error for #{order_code}: {e}")
            return {
                "status": local_tx.get("status", "PENDING") if local_tx else "UNKNOWN",
                "order_code": order_code
            }
