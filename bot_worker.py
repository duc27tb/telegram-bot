import asyncio
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

import os
import sys
import json
import random
from pyrogram import Client
from dotenv import load_dotenv

# Nhận tên thư mục từ file run_all truyền sang
if len(sys.argv) > 1:
    acc_folder = sys.argv[1].strip()
else:
    acc_folder = input("👉 Nhập tên thư mục tài khoản (Ví dụ: acc1_666): ").strip()

# Đường dẫn đọc file .env và file .session nằm trong thư mục riêng của acc
env_path = os.path.join(acc_folder, ".env")
session_path = os.path.join(acc_folder, acc_folder)

load_dotenv(dotenv_path=env_path)

# ĐƯỜNG DẪN DÙNG CHUNG: Đi ngược ra ngoài thư mục gốc để vào data/targets.json
TARGETS_FILE = os.path.join("data", "targets.json")

app = Client(session_path, api_id=os.getenv("API_ID"), api_hash=os.getenv("API_HASH"))

def load_config_data():
    if not os.path.exists(TARGETS_FILE):
        print(f"❌ Không tìm thấy file targets.json dùng chung tại: {TARGETS_FILE}")
        return [], [], 15
    try:
        with open(TARGETS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("group_ids", []), data.get("messages_pool", []), data.get("delay_seconds", 60)
    except Exception as e:
        print(f"❌ Lỗi đọc file targets.json: {e}")
        return [], [], 15

async def periodic_sender():
    print(f" -> [{acc_folder.upper()}] Nhiệm vụ dải tin nhắn đã kích hoạt.")
    while True:
        group_ids, messages_pool, delay = load_config_data()
        if group_ids and messages_pool:
            for group_id in group_ids:
                try:
                    text_to_send = random.choice(messages_pool)
                    await app.send_message(chat_id=group_id, text=text_to_send)
                    print(f" -> [{acc_folder.upper()} - Sent] Tới [{group_id}]: {text_to_send}")
                    await asyncio.sleep(2) # Giãn cách nhẹ 2 giây giữa các nhóm để tránh nghẽn dòng
                except Exception as e:
                    print(f"❌ [{acc_folder.upper()}] Lỗi gửi tới [{group_id}]: {e}")

        print(f"... Thư mục [{acc_folder.upper()}] đang chờ {delay} giây (đọc từ cấu hình) cho lượt tiếp theo ...\n")
        await asyncio.sleep(delay)

async def start_system():
    async with app:
        print("==============================================")
        print(f"BOT CỦA THƯ MỤC [{acc_folder.upper()}] ĐANG HOẠT ĐỘNG...")
        print("==============================================")
        # Chạy tác vụ dải tin tuần hoàn
        await periodic_sender()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(start_system())