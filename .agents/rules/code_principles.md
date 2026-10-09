---
description: Quy tắc phát triển code clean, phân chia module rõ ràng và tối ưu hiệu năng
---

# Quy Tắc Code Clean & Tối Ưu Hiệu Năng

1. **Clean Code & Tách Biệt Rõ Ràng**:
   - Phân chia rõ ràng giữa giao diện (UI) và xử lý logic (Services/Helpers).
   - Không gộp dồn quá nhiều chức năng vào 1 file, chia nhỏ thành các component tái sử dụng được.
   - Giữ mã nguồn ngắn gọn, dễ đọc, dễ mở rộng.

2. **Tối Ưu Hiệu Năng & Thời Gian Tải**:
   - Web phản hồi nhanh, không load chậm chạp.
   - Tránh re-render không cần thiết.
   - Mọi nút bấm làm mới hoặc tác vụ tải dữ liệu đều phải có hiệu ứng xoay (spin animation) mượt mà để phản hồi thị giác trực quan cho người dùng.

3. **Thực Tế & Trực Quan**:
   - Chỉ lưu và hiển thị dữ liệu hoạt động thực tế, không sinh mock data rác.
