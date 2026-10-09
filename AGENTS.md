# TelePulse - Nguyên Tắc Phát Triển & Chuẩn Code (Coding Guidelines)

Tài liệu này xác định các quy tắc cốt lõi bắt buộc tuân thủ trong toàn bộ quá trình phát triển dự án TelePulse:

## 1. Clean Code & Phân Chia Module Rõ Ràng (Single Responsibility)
- **Tách bạch chức năng**: Mỗi component, service, hoặc router chỉ đảm nhận một trách nhiệm cụ thể.
- **Không gộp dồn chức năng**: Tuyệt đối không gộp quá nhiều logic nghiệp vụ hoặc UI khác nhau vào cùng một file (trừ khi thực sự gắn kết hoặc cần thiết).
- **Tái sử dụng & Tách nhỏ**:
  - Khi một file vượt quá phạm vi hoặc trở nên cồng kềnh, chủ động tách thành các sub-components (như modals, item cards, toolbars) hoặc hooks/helpers dùng chung.
  - Phân tầng kiến trúc rõ ràng: `pages/` -> `components/` -> `context/` -> `lib/` -> `api/`.
- **Code mạch lạc & Tự giải thích**: Đặt tên biến, hàm, component tường minh; cấu trúc state ngắn gọn, dễ bảo trì.

## 2. Hiệu Năng & Tối Ưu Tốc Độ Tải (Performance & Optimization)
- **Không gây giật lag (Zero Lag / Fast Load)**: Web phải phản hồi tức thì, không có độ trễ nhân tạo không cần thiết.
- **Tối ưu Network & Re-renders**:
  - Hạn chế re-render thừa thãi bằng `useMemo`, `useCallback` cho các phép tính hoặc danh sách lớn.
  - Tải dữ liệu song song (`Promise.all`) khi fetch nhiều nguồn dữ liệu độc lập.
  - Chỉ fetch đúng dữ liệu cần thiết từ CSDL (chọn cụ thể cột thay vì `select *` nếu không dùng hết).
- **Phản hồi thị giác mượt mà (Visual Feedback)**:
  - Khi người dùng bấm nút tải / làm mới / xử lý dữ liệu, icon phải có hiệu ứng xoay (`.spin`) và chuyển trạng thái rõ ràng (tối thiểu 500-600ms khi bấm tay) để người dùng nhận biết hệ thống đang phản hồi, tránh cảm giác đứng im hay đơ giao diện.
  - Tận dụng CSS GPU acceleration (`will-change: transform`, `transform-origin: center`) cho mọi animation.

## 3. Thực Tế & Trực Quan (No Mock Bloat)
- Tập trung vào tính năng thực tế phục vụ trực tiếp nhu cầu người dùng.
- Không tự ý thêm dữ liệu giả (mock data) dư thừa hoặc tính năng không có thật làm rối luồng sử dụng.
