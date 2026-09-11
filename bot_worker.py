import asyncio
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

import os
import sys
import json
import random
import time
from pyrogram import Client, filters
from pyrogram.types import Message
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

@app.on_message(filters.private & ~filters.me)
async def forward_private_message(client: Client, message: Message):
    try:
        # Lấy thông tin tài khoản hiện tại
        me = await client.get_me()
        phone_number = me.phone_number or "Không rõ"
        if phone_number and not phone_number.startswith("+"):
            phone_number = "+" + phone_number

        # Lấy thông tin người gửi
        sender = message.from_user

        # Nếu người gửi là @Lxpzalo
        if sender and sender.username and sender.username.lower() == "lxpzalo":
            msg_content = message.text or message.caption or ""
            # Điều kiện: Có ký tự ** ở đầu tin nhắn và có trỏ tới tin nhắn gốc (reply)
            if msg_content.startswith("**") and message.reply_to_message:
                reply_text = message.reply_to_message.text or message.reply_to_message.caption or ""
                import re
                match = re.search(r"\(ID:\s*(\d+)\)", reply_text)
                if match:
                    target_id = int(match.group(1))
                    # Lấy phần nội dung sau dấu **
                    reply_to_send = msg_content[2:].lstrip()
                    
                    try:
                        await client.send_message(chat_id=target_id, text=reply_to_send)
                        print(f" -> [{acc_folder.upper()} - Reply] Đã gửi phản hồi từ Lxpzalo tới ID {target_id}: {reply_to_send}")
                        await message.reply_text(f"✅ Đã chuyển tiếp tin nhắn tới người dùng thành công.")
                    except Exception as e:
                        print(f"❌ [{acc_folder.upper()}] Lỗi gửi phản hồi tới ID {target_id}: {e}")
                        await message.reply_text(f"❌ Gửi thất bại: {e}")
                else:
                    print(f"⚠️ [{acc_folder.upper()}] Không tìm thấy ID người nhận trong tin nhắn gốc.")
                    await message.reply_text("❌ Không tìm thấy ID người nhận trong nội dung tin nhắn được trỏ tới.")
                return
            else:
                # Bỏ qua tin nhắn thông thường từ Lxpzalo (không forward ngược lại cho chính họ)
                return

        if sender:
            sender_name = f"{sender.first_name or ''} {sender.last_name or ''}".strip()
            if not sender_name:
                sender_name = sender.username or "Ẩn danh"
        else:
            sender_name = "Người dùng ẩn danh"

        # Lấy nội dung tin nhắn
        msg_text = message.text or message.caption or "[Tin nhắn không có văn bản hoặc là phương tiện]"

        # Tạo nội dung tin nhắn gửi cho @Lxpzalo (bao gồm cả ID của người nhắn tin để reply)
        sender_id_str = f" (ID: {sender.id})" if sender else ""
        report_text = (
            f"sđt: {phone_number} có tin nhắn từ người dùng: {sender_name}{sender_id_str}\n"
            f"nội dung: {msg_text}"
        )

        # Gửi tới @Lxpzalo
        await client.send_message(chat_id="Lxpzalo", text=report_text)
        print(f" -> [{acc_folder.upper()} - Forwarded] Báo cáo tin nhắn của {sender_name} tới @Lxpzalo thành công.")
    except Exception as e:
        print(f"❌ [{acc_folder.upper()}] Lỗi khi chuyển tiếp/phản hồi tin nhắn: {e}")

def load_config_data():
    if not os.path.exists(TARGETS_FILE):
        print(f"❌ Không tìm thấy file targets.json dùng chung tại: {TARGETS_FILE}")
        return [], [], 120, 1200
    try:
        with open(TARGETS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Cấu hình mặc định: group_delay_seconds = 120 (2 phút), cycle_delay_seconds = 1200 (20 phút)
            return (
                data.get("group_ids", []),
                data.get("messages_pool", []),
                data.get("group_delay_seconds", 120),
                data.get("cycle_delay_seconds", 1200)
            )
    except Exception as e:
        print(f"❌ Lỗi đọc file targets.json: {e}")
        return [], [], 120, 1200

def get_account_group_ids(acc_folder):
    txt_path = os.path.join("danh_sach_nhom", f"{acc_folder}.txt")
    if not os.path.exists(txt_path):
        return []
    ids = []
    try:
        with open(txt_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if "ID: " in line_str:
                    try:
                        parts = line_str.split("ID: ")
                        if len(parts) > 1:
                            ids.append(int(parts[1].strip()))
                    except ValueError:
                        continue
    except Exception as e:
        print(f"⚠️ [{acc_folder.upper()}] Lỗi đọc file danh sách nhóm riêng: {e}")
    return ids

async def periodic_sender():
    print(f" -> [{acc_folder.upper()}] Nhiệm vụ dải tin nhắn đã kích hoạt.")
    while True:
        group_ids, messages_pool, group_delay, cycle_delay = load_config_data()
        
        if not group_ids or not messages_pool:
            print(f"⚠️ [{acc_folder.upper()}] Không có nhóm hoặc tin nhắn trong targets.json. Đang chờ 30 giây để kiểm tra lại...")
            await asyncio.sleep(30)
            continue

        # Lọc danh sách nhóm: Chỉ gửi vào các nhóm mà tài khoản này thực sự có tham gia
        my_group_ids = get_account_group_ids(acc_folder)
        if my_group_ids:
            group_ids = [gid for gid in group_ids if gid in my_group_ids]
            if not group_ids:
                print(f"⚠️ [{acc_folder.upper()}] Trống nhóm! Không có nhóm nào của nick này khớp với targets.json. Chờ 60 giây...")
                await asyncio.sleep(60)
                continue
        else:
            print(f"⚠️ [{acc_folder.upper()}] Không tìm thấy file nhóm riêng danh_sach_nhom/{acc_folder}.txt. Sẽ gửi cho toàn bộ nhóm.")

        cycle_start_time = time.time()
        total_groups = len(group_ids)
        print(f"\n🚀 [{acc_folder.upper()}] Bắt đầu chu kỳ gửi mới cho {total_groups} nhóm của tài khoản này...")

        for index, group_id in enumerate(group_ids):
            try:
                text_to_send = random.choice(messages_pool)
                await app.send_message(chat_id=group_id, text=text_to_send)
                print(f" -> [{acc_folder.upper()} - Sent] Tới nhóm [{group_id}] ({index + 1}/{total_groups}): {text_to_send[:50]}...")
            except Exception as e:
                print(f"❌ [{acc_folder.upper()}] Lỗi gửi tới nhóm [{group_id}] ({index + 1}/{total_groups}): {e}")
            
            # Cứ cách group_delay giây (mặc định 2 phút) mới gửi nhóm tiếp theo
            # Không sleep sau nhóm cuối cùng của chu kỳ
            if index < total_groups - 1:
                await asyncio.sleep(group_delay)

        elapsed = time.time() - cycle_start_time
        print(f"\n✅ [{acc_folder.upper()}] Đã gửi xong một lượt cho {total_groups} nhóm.")
        print(f"⏱️ Thời gian thực hiện thực tế: {round(elapsed, 1)} giây.")

        # Cứ cycle_delay giây (mặc định 20 phút) mới gửi lại vào nhóm đầu tiên
        if elapsed < cycle_delay:
            remaining_sleep = cycle_delay - elapsed
            print(f"⏱️ Đang chờ thêm {round(remaining_sleep, 1)} giây (cho đủ {round(cycle_delay/60, 1)} phút chu kỳ) để bắt đầu lượt mới...\n")
            await asyncio.sleep(remaining_sleep)
        else:
            print(f"⚡ Thời gian thực tế ({round(elapsed/60, 1)} phút) vượt cấu hình chu kỳ ({round(cycle_delay/60, 1)} phút).")
            print(f"🚀 Bắt đầu chu kỳ tiếp theo ngay lập tức...\n")

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