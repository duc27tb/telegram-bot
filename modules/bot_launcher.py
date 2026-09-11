import os
import time
import subprocess
import psutil  # Thư viện quản lý tiến trình chuyên nghiệp
from .account_manager import get_all_account_folders
from .sync_manager import auto_sync_targets_json

def run_all_bots_workflow():
    """Đồng bộ nhóm trước rồi khởi chạy song song các nick"""
    print("\n🔍 Hệ thống đang tự động quét và làm mới targets.json...")
    auto_sync_targets_json()
    time.sleep(1.5)

    accounts = get_all_account_folders()
    print("\n====================================================")
    print("🚀 ĐANG KHỞI CHẠY HÀNG LOẠT CÁC TÀI KHOẢN...")
    print("====================================================\n")

    if not accounts:
        print("❌ Không tìm thấy tài khoản nào!")
        input("\nẤn Enter để quay lại Menu...")
        return

    for acc in accounts:
        session_file = os.path.join(acc, f"{acc}.session")
        if not os.path.exists(session_file):
            print(f"⚠️ Cảnh báo: Tài khoản [{acc.upper()}] chưa nạp OTP. Bỏ qua!")
            continue

        print(f"-> Đang bật Bot cho thư mục: [{acc.upper()}]...")
        cmd = f"start powershell -Command \"python bot_worker.py {acc}\""
        subprocess.Popen(cmd, shell=True)
        time.sleep(2)

    print("\n🎉 ĐÃ KÍCH HOẠT XONG! Vui lòng kiểm tra các cửa sổ PowerShell vừa bật lên.")
    input("\nẤn Enter để quay lại Menu chính...")

def kill_all_active_bots():
    """CHỨC NĂNG 3: Đóng tất cả các cửa sổ bot_worker đang chạy bằng Python thuần"""
    print("\n====================================================")
    print("🛑 ĐANG TIẾN HÀNH ĐÓNG CÁC CỬA SỔ BOT ĐANG CHẠY...")
    print("====================================================")

    killed_count = 0

    try:
        # Duyệt qua toàn bộ các tiến trình đang chạy trên máy tính Windows
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:

                # Kiểm tra xem tiến trình đó có phải là Python không
                if proc.info['name'] and 'python' in proc.info['name'].lower():
                    cmdline = proc.info['cmdline']

                    # Nếu trong câu lệnh chạy có chứa file 'bot_worker.py' thì xử đẹp luôn
                    if cmdline and any('bot_worker.py' in arg for arg in cmdline):
                        # Tìm tiến trình cha (chính là cửa sổ PowerShell đã sinh ra nó) để tắt cả cụm
                        parent = proc.parent()
                        if parent and 'powershell' in parent.name().lower():
                            parent.kill()  # Đóng luôn cả cửa sổ PowerShell
                        else:
                            proc.kill()  # Hoặc tắt riêng tiến trình python nếu không thấy cha

                        killed_count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        if killed_count > 0:
            print(f"\n🎉 ĐÃ DỪNG TOÀN BỘ BOT THÀNH CÔNG! Đã dọn dẹp sạch {killed_count} cửa sổ dải tin.")
        else:
            print("\n✨ Không tìm thấy cửa sổ Bot nào đang chạy ngầm.")

    except Exception as e:
        print(f"❌ Có lỗi xảy ra khi tắt tiến trình: {e}")

    input("\nẤn Enter để quay lại Menu chính...")