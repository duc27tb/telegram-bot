import os
import shutil
import asyncio
from pyrogram import Client
from dotenv import load_dotenv

ACC1_TEMPLATE = "acc1_440"

def get_all_account_folders():
    """Tự động quét và lấy tất cả các folder tài khoản dạng acc..."""
    account_folders = []
    if os.path.exists("."):
        for item in os.listdir("."):
            if os.path.isdir(item) and item.lower().startswith("acc"):
                account_folders.append(item)
    account_folders.sort()
    return account_folders

async def request_otp_for_new_acc(folder_name, phone_num):
    """Hàm xử lý kết nối Telegram, nạp OTP và quét nhóm CHỐNG GHI ĐÈ + KHÍT TIÊU ĐỀ"""
    env_path = os.path.join(folder_name, ".env")
    session_path = os.path.join(folder_name, folder_name)

    load_dotenv(dotenv_path=env_path)
    api_id = os.getenv("API_ID")
    api_hash = os.getenv("API_HASH")

    if not api_id or not api_hash:
        print("❌ Lỗi: Không tìm thấy API_ID hoặc API_HASH!")
        return False

    print(f"\n📞 Đang tiến hành kết nối Telegram cho số: {phone_num}...")
    app = Client(session_path, api_id=int(api_id), api_hash=api_hash, phone_number=phone_num)

    try:
        await app.start()
        print(f"\n✅ ĐĂNG NHẬP THÀNH CÔNG!")

        output_dir = "danh_sach_nhom"
        os.makedirs(output_dir, exist_ok=True)
        output_txt = os.path.join(output_dir, f"{folder_name}.txt")

        existing_ids = set()
        clean_lines = []
        file_existed = os.path.exists(output_txt)

        # 🗒️ BƯỚC 1: Đọc file cũ và lọc sạch các dòng trống/dòng tổng kết cũ
        if file_existed:
            try:
                with open(output_txt, "r", encoding="utf-8") as file:
                    for line in file:
                        line_str = line.strip()
                        # Bỏ qua hoàn toàn các dòng trống thừa thãi hoặc dòng tổng kết cũ
                        if not line_str or line_str.startswith("---") or "Tổng cộng tìm thấy" in line_str:
                            continue

                        # Giữ lại tiêu đề và các dòng nhóm hợp lệ (Đã strip sạch ký tự xuống dòng thừa)
                        if "ID: " in line_str or line_str.startswith("==") or "📌 DANH SÁCH CÁC NHÓM" in line_str:
                            clean_lines.append(line_str)

                            if "ID: " in line_str:
                                parts = line_str.split("ID: ")
                                if len(parts) > 1:
                                    existing_ids.add(parts[1].strip())
            except Exception as e:
                print(f"⚠️ Cảnh báo lỗi đọc file cũ: {e}")

        # Khởi tạo tiêu đề chuẩn nếu file chưa từng tồn tại (Không có dòng trống ngắt quãng)
        if not file_existed:
            clean_lines.append(f"========================================================================")
            clean_lines.append(f"          📌 DANH SÁCH CÁC NHÓM CỦA TÀI KHOẢN: {folder_name.upper()}")
            clean_lines.append(f"========================================================================")

        # 📥 BƯỚC 2: Quét Telegram lấy nhóm hiện tại và so sánh chèn thêm
        new_count = 0
        total_current_groups = 0
        new_lines_to_add = []

        async for dialog in app.get_dialogs():
            if dialog.chat.type.value in ["supergroup", "group"]:
                total_current_groups += 1
                chat_id_str = str(dialog.chat.id)

                if chat_id_str not in existing_ids:
                    chat_title = dialog.chat.title or "Nhóm không tên"
                    new_lines_to_add.append(f"Tên Nhóm: {chat_title} | ID: {dialog.chat.id}")
                    new_count += 1
                    existing_ids.add(chat_id_str)

        # 💾 BƯỚC 3: Ghi đè cấu hình siêu khít và gọn gàng vào file
        with open(output_txt, "w", encoding="utf-8") as file:
            # Ghi phần tiêu đề và các nhóm cũ (mỗi dòng cách nhau đúng 1 dấu \n)
            for line in clean_lines:
                file.write(line + "\n")

            # Ghi các nhóm mới tinh nếu có
            for line in new_lines_to_add:
                file.write(line + "\n")

            # Đóng khung báo cáo ở đáy file cách danh sách nhóm đúng 1 dòng trống cho thoáng
            file.write("\n------------------------------------------------------------------------\n")
            file.write(f"📊 Tổng cộng tìm thấy: {total_current_groups} nhóm.\n")
            file.write("------------------------------------------------------------------------\n")

        print("------------------------------------------------------------------------")
        print(f"📊 Tài khoản này hiện đang tham gia tổng cộng: {total_current_groups} nhóm trên Telegram.")
        if new_count > 0:
            print(f"💾 Đã chèn thêm {new_count} nhóm mới vào cuối file và cập nhật tổng kết: {output_txt}")
        else:
            print("✨ Đã dọn dẹp khoảng cách thừa và làm mới dòng tổng kết thành công!")
        print("------------------------------------------------------------------------")

        await app.stop()
        return True
    except Exception as e:
        print(f"\n❌ Thất bại: Lỗi xảy ra trong quá trình xác thực: {e}")
        return False

def add_new_account_workflow():
    """Quy trình thêm tài khoản mới từ A-Z"""
    print("\n====================================================")
    print("➕ THÊM TÀI KHOẢN MỜI MỚI (TỰ ĐỘNG HÓA TỪ A-Z)")
    print("====================================================")

    phone_input = input("👉 Nhập số điện thoại (Ví dụ: 0912345678): ").strip()
    if not phone_input: return

    phone_telegram = "+84" + phone_input[1:] if phone_input.startswith("0") else (phone_input if phone_input.startswith("+") else "+" + phone_input)
    last_3_digits = phone_input[-3:]

    # 🔑 BƯỚC 1: Tìm API_ID và API_HASH từ các nguồn có sẵn hoặc hỏi người dùng
    api_id = ""
    api_hash = ""

    # Danh sách các file .env để quét theo thứ tự ưu tiên
    env_paths_to_check = [
        ".env",                             # .env ở thư mục gốc
        os.path.join(ACC1_TEMPLATE, ".env") # Thư mục mẫu cũ
    ]

    # Quét thêm tất cả các thư mục acc* hiện có để tìm .env
    if os.path.exists("."):
        for item in os.listdir("."):
            if os.path.isdir(item) and item.lower().startswith("acc"):
                p = os.path.join(item, ".env")
                if p not in env_paths_to_check:
                    env_paths_to_check.append(p)

    # Đọc thử để tìm API_ID và API_HASH
    for path in env_paths_to_check:
        if os.path.exists(path):
            load_dotenv(dotenv_path=path, override=True)
            candidate_id = os.getenv("API_ID")
            candidate_hash = os.getenv("API_HASH")
            if candidate_id and candidate_hash:
                api_id = candidate_id
                api_hash = candidate_hash
                break

    # Nếu hoàn toàn không tìm thấy cấu hình ở đâu, yêu cầu người dùng nhập vào
    if not api_id or not api_hash:
        print("\n💡 Không tìm thấy cấu hình Telegram API (.env) ở bất kỳ đâu.")
        print("Vui lòng truy cập https://my.telegram.org đăng nhập và lấy thông tin:")
        api_id = input("👉 Nhập API_ID: ").strip()
        api_hash = input("👉 Nhập API_HASH: ").strip()

        if not api_id or not api_hash:
            print("❌ Lỗi: API_ID và API_HASH không được để trống!")
            input("\nẤn Enter để quay lại Menu chính...")
            return

        # Lưu lại vào file .env ở thư mục gốc làm mẫu cho các lần sau
        with open(".env", "w", encoding="utf-8") as f:
            f.write(f"API_ID={api_id}\n")
            f.write(f"API_HASH={api_hash}\n")
        print("💾 Đã lưu cấu hình API vào file `.env` ở thư mục gốc để tái sử dụng.")

    # 📁 BƯỚC 2: Tính toán tên thư mục mới và tạo thư mục
    existing_folders = get_all_account_folders()
    new_folder_name = f"acc{len(existing_folders) + 1}_{last_3_digits}"

    print(f"\n[🚀 Step 1]: Đang tự động tạo thư mục: {new_folder_name}...")
    os.makedirs(new_folder_name, exist_ok=True)

    print(f"[🚀 Step 2]: Đang thiết lập cấu hình API...")
    dest_env = os.path.join(new_folder_name, ".env")
    with open(dest_env, "w", encoding="utf-8") as f:
        f.write(f"API_ID={api_id}\n")
        f.write(f"API_HASH={api_hash}\n")

    print(f"[🚀 Step 3]: Bật cổng nhập mã OTP Telegram...")
    print("----------------------------------------------------------------")
    print("💡 LƯU Ý: Chuẩn bị nhìn màn hình, Telegram sẽ gửi mã CODE về điện thoại.")
    print("----------------------------------------------------------------")

    loop = asyncio.get_event_loop()
    success = False
    try:
        success = loop.run_until_complete(request_otp_for_new_acc(new_folder_name, phone_telegram))
    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình xác thực: {e}")

    if success:
        print(f"\n🎉 HOÀN THÀNH XUẤT SẮC! Đã cấu hình xong xuôi cho {new_folder_name.upper()}.")
    else:
        print("\n❌ Quá trình cài đặt thất bại. Đang tiến hành dọn dẹp thư mục tạm...")
        if os.path.exists(new_folder_name):
            try:
                shutil.rmtree(new_folder_name)
                print(f"🗑️ Đã xóa thư mục trống: {new_folder_name}")
            except Exception as delete_error:
                print(f"⚠️ Không thể xóa thư mục {new_folder_name}: {delete_error}")
    input("\nẤn Enter để quay lại Menu chính...")