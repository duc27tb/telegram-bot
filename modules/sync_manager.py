import os
import json

def auto_sync_targets_json():
    """TỰ ĐỘNG CẬP NHẬT TARGETS.JSON: Lọc trùng, loại trừ dấu '-' và giữ nguyên tin nhắn"""
    txt_dir = "danh_sach_nhom"
    targets_path = os.path.join("data", "targets.json")

    if not os.path.exists(txt_dir):
        print("⚠️ Thư mục danh_sach_nhom chưa tồn tại. Bỏ qua bước đồng bộ nhóm.")
        return True

    current_data = {}
    if os.path.exists(targets_path):
        try:
            with open(targets_path, "r", encoding="utf-8") as f:
                current_data = json.load(f)
        except Exception as e:
            print(f"⚠️ Cảnh báo lỗi đọc file targets.json cũ: {e}")

    messages_pool = current_data.get("messages_pool", ["📬 Nội dung quảng cáo mẫu..."])
    delay_seconds = current_data.get("delay_seconds", 5)

    unique_group_ids = set()
    ignored_count = 0

    for filename in os.listdir(txt_dir):
        if filename.endswith(".txt"):
            file_path = os.path.join(txt_dir, filename)
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line_str = line.strip()
                    if "ID: " in line_str:
                        if line_str.startswith("-"):
                            ignored_count += 1
                            continue
                        try:
                            parts = line_str.split("ID: ")
                            if len(parts) > 1:
                                unique_group_ids.add(int(parts[1].strip()))
                        except ValueError:
                            continue

    os.makedirs("data", exist_ok=True)
    new_targets_data = current_data.copy()
    new_targets_data["delay_seconds"] = delay_seconds
    new_targets_data["group_ids"] = list(unique_group_ids)
    new_targets_data["messages_pool"] = messages_pool
    new_targets_data.setdefault("group_delay_seconds", 120)
    new_targets_data.setdefault("cycle_delay_seconds", 1200)

    with open(targets_path, "w", encoding="utf-8") as f:
        json.dump(new_targets_data, f, ensure_ascii=False, indent=2)

    print("----------------------------------------------------")
    print(f"🔄 ĐÃ TỰ ĐỘNG ĐỒNG BỘ DANH SÁCH NHÓM:")
    print(f"📊 Tổng số nhóm dải tin (Lọc trùng): {len(unique_group_ids)}")
    print(f"🚫 Số nhóm bị loại bỏ (Có dấu '-'): {ignored_count}")
    print("----------------------------------------------------")
    return True