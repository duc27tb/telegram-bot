import asyncio
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

import os
import time

from modules.account_manager import get_all_account_folders, add_new_account_workflow
from modules.bot_launcher import run_all_bots_workflow, kill_all_active_bots # Thêm import hàm kill

def main():
    while True:
        os.system('cls' if os.name == 'nt' else 'clear')
        current_accs = get_all_account_folders()

        print("====================================================")
        print("🤖 HỆ THỐNG QUẢN LÝ TỔNG ĐÀI TELEGRAM BOT (MODULAR)")
        print("====================================================")
        print(f"📂 Danh sách nick đang sẵn sàng ({len(current_accs)}): {current_accs}")
        print("----------------------------------------------------")
        print("1️⃣  Chạy tất cả tài khoản dải tin nhắn (Run All)")
        print("2️⃣  Thêm tài khoản mời mới (Chỉ cần gõ SĐT)")
        print("3️⃣  Dừng khẩn cấp toàn bộ Bot đang dải tin")
        print("4️⃣  Thoát hệ thống")
        print("----------------------------------------------------")

        choice = input("👉 Mời Đức chọn chức năng (1-4): ").strip()

        if choice == "1":
            run_all_bots_workflow()
        elif choice == "2":
            add_new_account_workflow()
        elif choice == "3":
            kill_all_active_bots() # Kích hoạt dọn dẹp tab con
        elif choice == "4":
            print("\n👋 Tạm biệt Đức! Hệ thống đã dừng hoàn toàn.")
            break
        else:
            print("❌ Lựa chọn sai rồi, vui lòng bấm lại từ 1 đến 4 nhé!")
            time.sleep(1)

if __name__ == "__main__":
    main()