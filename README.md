========================================================================
🤖 HƯỚNG DẪN VẬN HÀNH BOT 🤖
========================================================================

THAO TÁC MỞ ĐẦU: CÁCH MỞ CỬA SỔ LỆNH (POWERSHELL), CÓ THỂ BẤM Alt +F12 ĐỂ MỞ

    Để gõ lệnh chạy Bot, bạn cần mở cửa sổ PowerShell theo các bước sau:
    
    1. Bật thư mục [telegram-bot] trên máy tính lên.
    2. Nhìn lên thanh địa chỉ của thư mục (thanh dài trên cùng hiển thị 
       đường dẫn ổ đĩa D:\telegram-bot...).
    3. Click chuột vào thanh đó, XÓA sạch chữ đi, gõ đúng 3 chữ: powershell
    4. Ấn phím [Enter] trên bàn phím.
    
    -> Ngay lập tức một cửa sổ màu xanh đen sẽ hiện ra. Đó là nơi để gõ lệnh.

------------------------------------------------------------------------
📌 1️⃣ BƯỚC 1: QUÉT VÀ LẤY DANH SÁCH ID NHÓM
------------------------------------------------------------------------

    Tại cửa sổ màu xanh đen vừa mở, bạn copy dòng lệnh này dán vào rồi ấn [Enter]:
    
    ╔══════════════════════════════════════════════════════════════════╗
    ║ python get_id.py                                                 ║
    ╚══════════════════════════════════════════════════════════════════╝
    
    * LƯU Ý QUAN TRỌNG KHI CHẠY LẦN ĐẦU TIÊN (ĐĂNG NHẬP):
      Màn hình sẽ dừng lại và hiện chữ [Enter phone number or bot token]:
      
      -> Bước A: Bạn gõ số điện thoại Telegram của mình vào (Nhớ thêm mã quốc
                 tế +84 ở đầu, ví dụ: +84912345678) rồi ấn Enter.
                 
      -> Bước B: Đợi vài giây, mở ứng dụng Telegram trên điện thoại ra lấy 
                 mã xác nhận gồm 5 chữ số. Quay lại cửa sổ lệnh gõ đúng 5 số 
                 đó vào rồi ấn Enter (Lúc gõ chữ sẽ bị ẩn đi, cứ gõ đúng rồi Enter).

------------------------------------------------------------------------
📌 2️⃣ BƯỚC 2: CÁCH CHỌN VÀ ĐIỀN NHÓM VÀO FILE JSON (CHI TIẾT)
------------------------------------------------------------------------

    ▶ Bước A: Khi lệnh ở Bước 1 chạy xong, bạn nhìn vào thư mục dự án sẽ thấy
              xuất hiện một file văn bản mới tên là [danh_sach_nhom.txt]. 
              Hãy click đúp chuột để mở nó lên.
    
    ▶ Bước B: Trong file này sẽ hiện tên các nhóm của bạn kèm một dãy số ID 
              ở phía sau (luôn có dấu trừ ở đầu, ví dụ: -100123456789). 
              Bạn bôi đen và Copy (sao chép) lấy dãy số ID này.
              
    ▶ Bước C: Quay lại thư mục, mở thư mục tên là [data], sau đó mở file 
              [targets.json] lên để dán ID vào.

    ⚠️ HƯỚNG DẪN CÁCH DÁN DẤU PHẨY ĐÚNG CÁCH TRONG FILE JSON:
    
       - Nếu bạn chỉ muốn gửi cho 1 nhóm duy nhất:
         Dán số ID vào giữa cặp dấu ngoặc vuông. File sẽ trông như thế này:
         {
             "group_ids": [
                 -100123456789
             ]
         }
         
       - Nếu bạn muốn gửi cho NHIỀU nhóm (Từ nhóm thứ 2 trở đi):
         Bạn phải gõ thêm một dấu phẩy [ , ] vào sau số ID cũ, sau đó bấm 
         xuống dòng rồi mới dán số ID của nhóm tiếp theo vào. 
         Nhóm CUỐI CÙNG trong danh sách thì KHÔNG ĐƯỢC CÓ dấu phẩy ở đuôi.
         
         File khi dán nhiều nhóm chuẩn sẽ trông y hệt như thế này:
         {
             "group_ids": [
                 -100123456789,
                 -100987654321,
                 -100111222333
             ]
         }
              
    ▶ Bước D: Sau khi dán xong, bấm tổ hợp phím [Ctrl + S] để lưu file lại.

------------------------------------------------------------------------
📌 3️⃣ BƯỚC 3: CÁCH ĐỔI VÀ SỬA NỘI DUNG TIN NHẮN QUẢNG CÁO
------------------------------------------------------------------------

    Nếu bạn muốn thay đổi nội dung văn bản đi quảng cáo, bạn cũng mở file 
    [data/targets.json] ra để sửa đổi ở phần ["messages_pool"].

    ⚠️ QUY TẮC SỬA TIN NHẮN TUYỆT ĐỐI KHÔNG ĐƯỢC SAI:
    - Mọi câu tin nhắn bắt buộc phải được bọc trong cặp dấu ngoặc kép " ".
    - Giữa các câu phải ngăn cách nhau bằng dấu phẩy [ , ] và xuống dòng.
    - Câu tin nhắn CUỐI CÙNG thì KHÔNG ĐƯỢC CÓ dấu phẩy ở đuôi.

    Mẫu file hoàn chỉnh khi có cả Nhóm và cả Tin nhắn sẽ trông như thế này:
    {
        "group_ids": [
            -100123456789,
            -100987654321
        ],
        "messages_pool": [
            "Nội dung câu tin nhắn quảng cáo thứ nhất của bạn.",
            "Nội dung câu tin nhắn quảng cáo thứ hai của bạn.",
            "Nội dung câu tin nhắn quảng cáo cuối cùng (Không có dấu phẩy ở đuôi)"
        ]
    }

    ▶ Sau khi sửa xong, bấm tổ hợp phím [Ctrl + S] để lưu file lại.
    (Mẹo: Nếu Bot đang chạy, bạn cứ vào sửa rồi lưu file bình thường, 
    Bot sẽ tự nhận nội dung mới luôn mà không cần tắt đi bật lại).

------------------------------------------------------------------------
📌 4️⃣ BƯỚC 4: BẬT BOT HOẠT ĐỘNG
------------------------------------------------------------------------

    Quay lại cửa sổ màu xanh đen, copy dòng lệnh này dán vào rồi ấn [Enter]:
    
    ╔══════════════════════════════════════════════════════════════════╗
    ║ python main.py                                                   ║
    ╚══════════════════════════════════════════════════════════════════╝
    
    ====================================================================
    |  * CHỨC NĂNG CỦA BOT KHI CHẠY:                                   |
    |    - Bot sẽ tự động đi gửi tin nhắn vào các nhóm bạn chọn ở Bước 2. |
    |    - Song song đó, nếu có khách nhắn tin riêng, Bot sẽ tự động rep.  |
    |                                                                  |
    |  * CÁCH TẮT KHÔNG CHO BOT CHẠY NỮA:                              |
    |    - Bấm giữ phím [Ctrl] và bấm phím [C] trên bàn phím.              |
    ====================================================================

------------------------------------------------------------------------
🔄 CÁCH ĐỔI SANG SỐ ĐIỆN THOẠI KHÁC ĐỂ CHẠY
------------------------------------------------------------------------

    Nếu sau này bạn muốn thay số điện thoại khác để chạy quảng cáo:
    
    1. Vào thư mục dự án, tìm file tên là [my_account.session] và XÓA nó đi.
    2. Thực hiện lại đúng theo thứ tự từ [BƯỚC 1] để đăng nhập số mới.

========================================================================
HỆ THỐNG ĐÃ SẴN SÀNG VẬN HÀNH!
========================================================================