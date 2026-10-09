import os
import json
import time
from typing import Dict, Any, List, Optional

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
STORE_FILE = os.path.join(DATA_DIR, "wallet_store.json")

def _load_data() -> Dict[str, Any]:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(STORE_FILE):
        initial = {
            "balances": {},
            "transactions": [],
            "subscriptions": {}
        }
        with open(STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(initial, f, ensure_ascii=False, indent=2)
        return initial

    try:
        with open(STORE_FILE, "r", encoding="utf-8") as f:
            d = json.load(f)
            if "subscriptions" not in d:
                d["subscriptions"] = {}
            return d
    except Exception:
        return {"balances": {}, "transactions": [], "subscriptions": {}}

def _save_data(data: Dict[str, Any]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

class LocalWalletStore:
    @classmethod
    def get_balance(cls, user_id: str) -> Optional[int]:
        data = _load_data()
        return data.get("balances", {}).get(user_id)

    @classmethod
    def set_balance(cls, user_id: str, new_balance: int):
        data = _load_data()
        if "balances" not in data:
            data["balances"] = {}
        data["balances"][user_id] = new_balance
        _save_data(data)

    @classmethod
    def save_transaction(cls, tx: Dict[str, Any]):
        data = _load_data()
        transactions = data.get("transactions", [])
        
        # Check if already exists
        order_code = tx.get("order_code")
        updated = False
        for i, existing in enumerate(transactions):
            if existing.get("order_code") == order_code:
                transactions[i] = {**existing, **tx}
                updated = True
                break
        
        if not updated:
            transactions.insert(0, tx)
            
        data["transactions"] = transactions[:50] # Keep 50 recent
        _save_data(data)

    @classmethod
    def get_transaction(cls, order_code: int) -> Optional[Dict[str, Any]]:
        data = _load_data()
        for tx in data.get("transactions", []):
            if tx.get("order_code") == order_code:
                return tx
        return None

    @classmethod
    def get_user_transactions(cls, user_id: str) -> List[Dict[str, Any]]:
        data = _load_data()
        return [tx for tx in data.get("transactions", []) if tx.get("user_id") == user_id]

    @classmethod
    def credit_user(cls, user_id: str, amount: int, order_code: int, reference_id: str = "") -> int:
        data = _load_data()
        if "balances" not in data:
            data["balances"] = {}
        current = data["balances"].get(user_id, 0)
        new_balance = current + amount
        data["balances"][user_id] = new_balance

        # Mark transaction as PAID
        for tx in data.get("transactions", []):
            if tx.get("order_code") == order_code:
                tx["status"] = "PAID"
                tx["payos_transaction_id"] = reference_id
                break

        _save_data(data)
        return new_balance

    @classmethod
    def get_subscription(cls, user_id: str) -> Dict[str, Any]:
        data = _load_data()
        sub = data.get("subscriptions", {}).get(user_id)
        if not sub:
            return {"tier": "FREE", "expires_at": None}
        
        # Kiểm tra hạn sử dụng nếu có
        exp_str = sub.get("expires_at")
        if exp_str:
            try:
                from datetime import datetime
                exp_dt = datetime.fromisoformat(exp_str.replace("Z", "+00:00")).replace(tzinfo=None)
                if exp_dt < datetime.utcnow():
                    return {"tier": "FREE", "expires_at": exp_str, "expired": True}
            except Exception:
                pass
        return sub

    @classmethod
    def get_subscription_tier(cls, user_id: str) -> str:
        sub = cls.get_subscription(user_id)
        return sub.get("tier", "FREE").upper()

    @classmethod
    def set_subscription(cls, user_id: str, tier: str, expires_at: Optional[str] = None):
        data = _load_data()
        if "subscriptions" not in data:
            data["subscriptions"] = {}
        data["subscriptions"][user_id] = {
            "tier": tier.upper(),
            "expires_at": expires_at,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        _save_data(data)
