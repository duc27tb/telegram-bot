import os
import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database import get_supabase
from app.services.cloud_kv import CloudKV

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
STORE_FILE = os.path.join(DATA_DIR, "wallet_store.json")

def _load_data() -> Dict[str, Any]:
    d = CloudKV.load("wallet_store.json", lambda: {
        "balances": {},
        "transactions": [],
        "subscriptions": {}
    })
    d.setdefault("balances", {})
    d.setdefault("transactions", [])
    d.setdefault("subscriptions", {})
    return d

def _save_data(data: Dict[str, Any]):
    CloudKV.save("wallet_store.json", data)

# Bộ nhớ đệm ngắn hạn (RAM Cache) tăng tốc độ query cho các vòng lặp gửi tin
_mem_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL = 15 # 15 giây

def _get_cached(key: str) -> Optional[Any]:
    if key in _mem_cache and time.time() - _mem_cache[key]["ts"] < CACHE_TTL:
        return _mem_cache[key]["val"]
    return None

def _set_cached(key: str, val: Any):
    _mem_cache[key] = {"val": val, "ts": time.time()}

def _invalidate_cached(user_id: str):
    _mem_cache.pop(f"bal_{user_id}", None)
    _mem_cache.pop(f"sub_{user_id}", None)

class LocalWalletStore:
    @classmethod
    def get_balance(cls, user_id: str) -> Optional[int]:
        """Lấy số dư tài khoản (Ưu tiên Supabase profiles.balance)"""
        if not user_id:
            return 0

        cached = _get_cached(f"bal_{user_id}")
        if cached is not None:
            return cached

        sb = get_supabase()
        if sb:
            try:
                res = sb.table("profiles").select("balance").eq("id", user_id).single().execute()
                if res.data and res.data.get("balance") is not None:
                    bal = int(res.data["balance"])
                    _set_cached(f"bal_{user_id}", bal)
                    return bal
            except Exception:
                pass

        # Fallback đọc CloudKV + local file
        data = _load_data()
        bal = data.get("balances", {}).get(user_id, 0)
        _set_cached(f"bal_{user_id}", bal)
        return bal

    @classmethod
    def set_balance(cls, user_id: str, new_balance: int):
        """Cập nhật số dư tài khoản vào Supabase profiles và CloudKV store"""
        if not user_id:
            return

        _set_cached(f"bal_{user_id}", new_balance)

        # 1. Cập nhật Supabase profiles
        sb = get_supabase()
        if sb:
            try:
                sb.table("profiles").update({
                    "balance": new_balance,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }).eq("id", user_id).execute()
            except Exception as e:
                print(f"⚠️ [WalletStore] Lỗi cập nhật Supabase balance: {e}")

        # 2. Cập nhật CloudKV + local backup
        data = _load_data()
        if "balances" not in data:
            data["balances"] = {}
        data["balances"][user_id] = new_balance
        _save_data(data)

    @classmethod
    def save_transaction(cls, tx: Dict[str, Any]):
        """Lưu đơn nạp tiền vào Supabase deposit_transactions và CloudKV store"""
        order_code = tx.get("order_code")
        user_id = tx.get("user_id")

        # 1. Lưu Supabase
        sb = get_supabase()
        if sb and user_id and order_code:
            try:
                sb.table("deposit_transactions").upsert({
                    "user_id": user_id,
                    "order_code": order_code,
                    "amount": tx.get("amount", 0),
                    "description": tx.get("description", ""),
                    "status": tx.get("status", "PENDING"),
                    "payment_link_id": tx.get("payment_link_id"),
                    "checkout_url": tx.get("checkout_url"),
                    "qr_code": tx.get("qr_code"),
                    "bank_bin": tx.get("bank_bin"),
                    "bank_account_number": tx.get("bank_account_number"),
                    "bank_account_name": tx.get("bank_account_name"),
                    "payos_transaction_id": tx.get("payos_transaction_id"),
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }, on_conflict="order_code").execute()
            except Exception as e:
                print(f"⚠️ [WalletStore] Lỗi lưu Supabase transaction: {e}")

        # 2. Lưu CloudKV + local backup
        data = _load_data()
        transactions = data.get("transactions", [])
        updated = False
        for i, existing in enumerate(transactions):
            if existing.get("order_code") == order_code:
                transactions[i] = {**existing, **tx}
                updated = True
                break
        if not updated:
            transactions.insert(0, tx)
        data["transactions"] = transactions[:50]
        _save_data(data)

    @classmethod
    def get_transaction(cls, order_code: int) -> Optional[Dict[str, Any]]:
        """Lấy thông tin giao dịch theo mã đơn hàng"""
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("deposit_transactions").select("*").eq("order_code", order_code).single().execute()
                if res.data:
                    return res.data
            except Exception:
                pass

        data = _load_data()
        for tx in data.get("transactions", []):
            if tx.get("order_code") == order_code:
                return tx
        return None

    @classmethod
    def get_user_transactions(cls, user_id: str) -> List[Dict[str, Any]]:
        """Lấy lịch sử giao dịch nạp tiền của người dùng"""
        sb = get_supabase()
        if sb:
            try:
                res = sb.table("deposit_transactions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
                if res.data and len(res.data) > 0:
                    return res.data
            except Exception:
                pass

        data = _load_data()
        return [tx for tx in data.get("transactions", []) if tx.get("user_id") == user_id]

    @classmethod
    def credit_user(cls, user_id: str, amount: int, order_code: int, reference_id: str = "") -> int:
        """Cộng tiền an toàn cho người dùng (Tự động fallback nếu chưa tạo RPC SQL)"""
        new_balance = 0
        _invalidate_cached(user_id)

        sb = get_supabase()
        if sb:
            try:
                rpc_res = sb.rpc("increment_user_balance", {"p_user_id": user_id, "p_amount": amount}).execute()
                if rpc_res.data is not None:
                    new_balance = int(rpc_res.data)
            except Exception:
                pass

            if new_balance <= 0:
                try:
                    curr_res = sb.table("profiles").select("balance").eq("id", user_id).single().execute()
                    curr_bal = (curr_res.data.get("balance") or 0) if curr_res.data else 0
                    new_balance = int(curr_bal) + int(amount)
                    sb.table("profiles").update({"balance": new_balance}).eq("id", user_id).execute()
                except Exception as e:
                    print(f"⚠️ [WalletStore] Lỗi cộng balance bảng profiles: {e}")

            try:
                sb.table("deposit_transactions").update({
                    "status": "PAID",
                    "payos_transaction_id": reference_id,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }).eq("order_code", order_code).execute()
            except Exception:
                pass

        # 2. Cập nhật CloudKV + local backup
        data = _load_data()
        if "balances" not in data:
            data["balances"] = {}
        current = data["balances"].get(user_id, 0)
        local_new = current + amount
        if new_balance <= 0:
            new_balance = local_new
        data["balances"][user_id] = new_balance

        for tx in data.get("transactions", []):
            if tx.get("order_code") == order_code:
                tx["status"] = "PAID"
                tx["payos_transaction_id"] = reference_id
                break

        _save_data(data)
        _set_cached(f"bal_{user_id}", new_balance)
        return new_balance

    @classmethod
    def get_subscription(cls, user_id: str) -> Dict[str, Any]:
        """Lấy thông tin gói cước của người dùng (Ưu tiên Supabase profiles -> CloudKV)"""
        if not user_id:
            return {"tier": "FREE", "expires_at": None}

        cached = _get_cached(f"sub_{user_id}")
        if cached:
            return cached

        sb = get_supabase()
        if sb:
            try:
                res = sb.table("profiles").select("subscription_tier, tier_expires_at").eq("id", user_id).single().execute()
                if res.data and res.data.get("subscription_tier"):
                    tier = (res.data.get("subscription_tier") or "FREE").upper()
                    exp_str = res.data.get("tier_expires_at")
                    
                    if tier == "VIP" and exp_str:
                        try:
                            exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00")).replace(tzinfo=None)
                            if exp_dt < datetime.utcnow():
                                sb.table("profiles").update({"subscription_tier": "FREE"}).eq("id", user_id).execute()
                                result = {"tier": "FREE", "expires_at": exp_str, "expired": True}
                                _set_cached(f"sub_{user_id}", result)
                                return result
                        except Exception:
                            pass

                    result = {"tier": tier, "expires_at": exp_str}
                    _set_cached(f"sub_{user_id}", result)
                    return result
            except Exception:
                pass

        # Tự động đọc từ CloudKV (Supabase Storage)
        data = _load_data()
        sub = data.get("subscriptions", {}).get(user_id)
        if not sub:
            return {"tier": "FREE", "expires_at": None}

        exp_str = sub.get("expires_at")
        if exp_str:
            try:
                exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00")).replace(tzinfo=None)
                if exp_dt < datetime.utcnow():
                    return {"tier": "FREE", "expires_at": exp_str, "expired": True}
            except Exception:
                pass

        _set_cached(f"sub_{user_id}", sub)
        return sub

    @classmethod
    def get_subscription_tier(cls, user_id: str) -> str:
        """Lấy tên gói cước hiện tại ('FREE' hoặc 'VIP')"""
        sub = cls.get_subscription(user_id)
        return sub.get("tier", "FREE").upper()

    @classmethod
    def set_subscription(cls, user_id: str, tier: str, expires_at: Optional[str] = None):
        """Cập nhật gói cước cho người dùng vào Supabase và CloudKV"""
        clean_tier = tier.upper().strip()
        _invalidate_cached(user_id)

        # 1. Cập nhật Supabase profiles (nếu đã có cột)
        sb = get_supabase()
        if sb and user_id:
            try:
                sb.table("profiles").update({
                    "subscription_tier": clean_tier,
                    "tier_expires_at": expires_at,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }).eq("id", user_id).execute()
            except Exception:
                pass

        # 2. Tự động lưu lên CloudKV (Supabase Storage) + local backup
        data = _load_data()
        if "subscriptions" not in data:
            data["subscriptions"] = {}
        data["subscriptions"][user_id] = {
            "tier": clean_tier,
            "expires_at": expires_at,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        _save_data(data)
        _set_cached(f"sub_{user_id}", {"tier": clean_tier, "expires_at": expires_at})
