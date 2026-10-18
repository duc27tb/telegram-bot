from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from app.services.pyrogram_engine import bot_engine
from app.database import get_supabase

router = APIRouter(prefix="/api/chat", tags=["Live Chat"])

class ReplyMessageBody(BaseModel):
    user_id: str
    account_id: str
    customer_sender_id: int
    text: str

@router.post("/reply")
async def reply_customer(body: ReplyMessageBody):
    # Kiểm tra gói cước: Chỉ tài khoản VIP mới được sử dụng tính năng Live Chat 2 chiều
    from app.services.wallet_store import LocalWalletStore
    tier = LocalWalletStore.get_subscription_tier(body.user_id)
    if tier != "VIP":
        raise HTTPException(
            status_code=403, 
            detail="Tính năng Live Chat 2 chiều chỉ dành riêng cho hội viên gói VIP Pro!"
        )

    result = await bot_engine.send_customer_reply(
        account_id=body.account_id,
        customer_sender_id=body.customer_sender_id,
        text=body.text,
        user_id=body.user_id
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Lỗi gửi phản hồi"))
    return result

@router.get("/media/{account_id}/{chat_id}/{message_id}")
async def get_chat_media(account_id: str, chat_id: int, message_id: int):
    """Stream dữ liệu hình ảnh hoặc tài liệu từ Telegram MTProto theo yêu cầu (On-Demand)"""
    result = await bot_engine.download_media_stream(account_id, chat_id, message_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Không thể tải media"))

    headers = {
        "Content-Disposition": f'{result["disposition"]}; filename="{result["filename"]}"',
        "Cache-Control": "public, max-age=86400"
    }
    return Response(
        content=result["bytes"],
        media_type=result["mime_type"],
        headers=headers
    )
