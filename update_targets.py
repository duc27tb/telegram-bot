import os
import json

def update_targets_json():
    txt_dir = "danh_sach_nhom"
    targets_path = os.path.join("data", "targets.json")

    if not os.path.exists(txt_dir):
        print(f"❌ Không tìm thấy thư mục [{txt_dir}]. Vui lòng quét nhóm trước!")
        return

    # 🗒️ BƯỚC 1: Đọc nội dung hiện tại của targets.json để giữ lại tin nhắn quảng cáo (messages_pool)
    current_data = {}
    if os.path.exists(targets_path):
        try:
            with open(targets_path, "r", encoding="utf-8") as f:
                current_data = json.load(f)
        except Exception as e:
            print(f"⚠️ Cảnh báo lỗi đọc file targets.json cũ: {e}")
            print("Hệ thống sẽ tạo mới cấu trúc.")

    # Giữ lại messages_pool và delay_seconds cũ, nếu chưa có thì để mặc định
    messages_pool = current_data.get("messages_pool", ["\uD83D\uDE00... Nội dung tin nhắn mẫu ..."])
    delay_seconds = current_data.get("delay_seconds", 5)

    # 🔍 BƯỚC 2: Quét tất cả các file .txt để gom ID nhóm
    unique_group_ids = set()
    ignored_count = 0
    added_count = 0

    print("\n🔄 Đang xử lý danh sách nhóm từ các tài khoản...")

    for filename in os.listdir(txt_dir):
        if filename.endswith(".txt"):
            file_path = os.path.join(txt_dir, filename)

            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line_str = line.strip()

                    # Kiểm tra xem dòng này có chứa thông tin nhóm hợp lệ không
                    if "ID: " in line_str:
                        # 🚫 THUẬT TOÁN LOẠI TRỪ: Nếu dòng bắt đầu bằng dấu "-" thì bỏ qua
                        if line_str.startswith("-"):
                            ignored_count += 1
                            continue

                        # Bốc tách lấy ID nhóm
                        try:
                            parts = line_str.split("ID: ")
                            if len(parts) > 1:
                                group_id = int(parts[1].strip())
                                unique_group_ids.add(group_id)
                                added_count += 1
                        except ValueError:
                            # Phòng trường hợp ID không phải là số hợp lệ
                            continue

    # Chuyển set thành list để lưu vào JSON
    group_ids_list = list(unique_group_ids)

    # 💾 BƯỚC 3: Ghi dữ liệu mới vào targets.json
    os.makedirs("data", exist_ok=True)
    new_targets_data = {
        "delay_seconds": delay_seconds,
        "group_ids": group_ids_list,
        "messages_pool": messages_pool
    }

    with open(targets_path, "w", encoding="utf-8") as f:
        json.dump(new_targets_data, f, ensure_ascii=False, indent=2)

    print("------------------------------------------------------------------------")
    print(f"🎉 ĐÃ CẬP NHẬT TỰ ĐỘNG FILE TARGETS.JSON THÀNH CÔNG!")
    print(f"📊 Tổng số ID nhóm được nạp (đã lọc trùng): {len(group_ids_list)}")
    print(f"🚫 Số nhóm bị bỏ qua do có dấu '-': {ignored_count}")
    print(f"👉 Đường dẫn file: {targets_path}")
    print("------------------------------------------------------------------------")

if __name__ == "__main__":
    update_targets_json()