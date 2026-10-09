import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services.payos_service import PayOSService
from app.services.wallet_store import LocalWalletStore
from app.database import get_supabase

router = APIRouter(prefix="/api/wallet", tags=["Wallet"])

class CreateDepositBody(BaseModel):
    user_id: str
    amount: int
    return_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CreditManualBody(BaseModel):
    user_id: str
    amount: int
    note: Optional[str] = "Manual credit"

@router.post("/create-deposit")
async def create_deposit(body: CreateDepositBody):
    """Tạo đơn nạp tiền VietQR qua PayOS"""
    if body.amount < 10000:
        raise HTTPException(status_code=400, detail="Số tiền nạp tối thiểu là 10.000 VNĐ")

    try:
        data = PayOSService.create_deposit_order(
            user_id=body.user_id,
            amount=body.amount,
            return_url=body.return_url,
            cancel_url=body.cancel_url
        )
        return {"success": True, "data": data}
    except Exception as e:
        print(f"❌ Lỗi tạo đơn nạp PayOS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def payos_webhook(request: Request):
    """Endpoint nhận Webhook từ PayOS khi thanh toán hoàn tất"""
    try:
        body = await request.json()
        result = PayOSService.handle_webhook(body)
        return {"error": 0, "message": "Success", "data": result}
    except ValueError as val_err:
        print(f"❌ Webhook validation error: {val_err}")
        return {"error": -1, "message": str(val_err)}
    except Exception as e:
        print(f"❌ Webhook processing error: {e}")
        return {"error": -1, "message": str(e)}

@router.get("/status/{order_code}")
async def get_order_status(order_code: int):
    """Kiểm tra trạng thái nạp tiền của mã đơn hàng"""
    try:
        result = PayOSService.check_order_status(order_code)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/info/{user_id}")
async def get_wallet_info(user_id: str):
    """Lấy số dư hiện tại và lịch sử nạp tiền (kết hợp Supabase & LocalWalletStore)"""
    local_balance = LocalWalletStore.get_balance(user_id)
    local_txs = LocalWalletStore.get_user_transactions(user_id)
    subscription = LocalWalletStore.get_subscription(user_id)

    sb = get_supabase()
    balance = local_balance if local_balance is not None else 0
    transactions = local_txs

    if sb:
        sb_bal = None
        try:
            profile_res = sb.table("profiles").select("balance").eq("id", user_id).single().execute()
            if profile_res.data and "balance" in profile_res.data and profile_res.data["balance"] is not None:
                sb_bal = profile_res.data["balance"]
        except Exception:
            pass

        if local_balance is None:
            balance = sb_bal if sb_bal is not None else 0
            if sb_bal is not None:
                LocalWalletStore.set_balance(user_id, sb_bal)
        else:
            # Lấy max giữa local và supabase nếu vừa nạp tiền
            if sb_bal is not None and sb_bal > local_balance:
                balance = sb_bal
                LocalWalletStore.set_balance(user_id, sb_bal)
            else:
                balance = local_balance
                if sb_bal is not None and sb_bal != local_balance:
                    try:
                        sb.table("profiles").update({"balance": local_balance}).eq("id", user_id).execute()
                    except Exception:
                        pass

        try:
            tx_res = sb.table("deposit_transactions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
            if tx_res.data and len(tx_res.data) > 0:
                transactions = tx_res.data
        except Exception:
            pass

    return {
        "success": True,
        "data": {
            "balance": balance,
            "transactions": transactions,
            "subscription": subscription
        }
    }

@router.post("/credit-manual")
async def credit_manual(body: CreditManualBody):
    """Cộng tiền thủ công cho tài khoản"""
    new_bal = LocalWalletStore.credit_user(body.user_id, body.amount, int(time.time()), body.note)
    return {"success": True, "balance": new_bal}

class UpgradeVipBody(BaseModel):
    user_id: str

@router.get("/plans")
async def get_subscription_plans():
    """Lấy danh sách các gói dịch vụ"""
    from app.routers.admin import _load_plans
    plans = _load_plans()
    return {"success": True, "data": plans}

@router.post("/upgrade-vip")
async def upgrade_vip(body: UpgradeVipBody):
    """Nâng cấp tài khoản lên VIP Pro (30 ngày) bằng số dư ví"""
    from datetime import datetime, timedelta
    from app.services.activity_service import ActivityService
    from app.routers.admin import _load_plans

    user_id = body.user_id
    plans = _load_plans()
    vip_plan = plans.get("vip", {})
    cost = vip_plan.get("price", 199000)
    duration_days = vip_plan.get("duration_days", 30)

    # 1. Lấy số dư hiện tại và gói cước hiện tại
    local_bal = LocalWalletStore.get_balance(user_id)
    sub_info = LocalWalletStore.get_subscription(user_id)
    curr_expiry = sub_info.get("expires_at")
    sb = get_supabase()
    sb_bal = None
    if sb:
        try:
            p_res = sb.table("profiles").select("balance").eq("id", user_id).single().execute()
            if p_res.data and p_res.data.get("balance") is not None:
                sb_bal = p_res.data["balance"]
        except Exception as e:
            print(f"⚠️ Error reading profile balance: {e}")

    if local_bal is None:
        balance = sb_bal if sb_bal is not None else 0
    else:
        balance = max(local_bal, sb_bal) if sb_bal is not None else local_bal

    # 2. Kiểm tra số dư
    if balance < cost:
        diff = cost - balance
        raise HTTPException(
            status_code=400,
            detail=f"Số dư ví không đủ ({balance:,} ₫). Vui lòng nạp thêm tối thiểu {diff:,} ₫ để nâng cấp gói VIP Pro."
        )

    # 3. Tính toán ngày hết hạn mới
    now = datetime.utcnow()
    new_expiry_dt = now + timedelta(days=duration_days)
    if curr_expiry:
        try:
            parsed_exp = datetime.fromisoformat(curr_expiry.replace("Z", "+00:00")).replace(tzinfo=None)
            if parsed_exp > now:
                new_expiry_dt = parsed_exp + timedelta(days=duration_days)
        except Exception:
            pass

    new_balance = balance - cost
    new_expiry_str = new_expiry_dt.isoformat() + "Z"

    # 4. Trừ tiền và cập nhật trạng thái trong Local Store
    LocalWalletStore.set_balance(user_id, new_balance)
    LocalWalletStore.set_subscription(user_id, "VIP", new_expiry_str)

    # Cập nhật số dư trong Supabase profiles
    if sb:
        try:
            sb.table("profiles").update({"balance": new_balance}).eq("id", user_id).execute()
        except Exception as e:
            print(f"⚠️ Error updating Supabase profile balance: {e}")

    # 5. Ghi log activity
    try:
        ActivityService.log_activity(
            user_id=user_id,
            action_type="SUBSCRIPTION_UPGRADE",
            title="Nâng cấp gói VIP Pro (30 Ngày)",
            description=f"Đã trừ {cost:,} ₫ từ ví. Hạn sử dụng VIP Pro đến {new_expiry_dt.strftime('%d/%m/%Y %H:%M')}."
        )
    except Exception:
        pass

    # Gửi thông báo Telegram Bot tự động (UC-07)
    try:
        import asyncio
        from app.services.telegram_alert_service import TelegramAlertService
        asyncio.create_task(TelegramAlertService.notify_vip_activated(
            user_id=user_id,
            plan_name=vip_plan.get("name", "VIP Pro (30 Ngày)"),
            expires_at=new_expiry_dt.strftime("%d/%m/%Y"),
            cost=cost
        ))
    except Exception:
        pass

    return {
        "success": True,
        "data": {
            "subscription_tier": "VIP",
            "tier_expires_at": new_expiry_str,
            "new_balance": new_balance,
            "message": f"Chúc mừng bạn đã nâng cấp thành công gói VIP Pro! Hạn dùng đến {new_expiry_dt.strftime('%d/%m/%Y')}."
        }
    }

