import React from 'react';
import { ArrowLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle2, Bot, ExternalLink, HelpCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main, #0b0f19)',
      color: 'var(--text-main, #f8fafc)',
      padding: '40px 20px 80px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: '1px solid var(--border-medium, rgba(148, 163, 184, 0.25))',
              color: 'var(--text-secondary, #cbd5e1)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1 0%, #a855f7 100%))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Bot size={16} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main, #fff)' }}>TelePulse</span>
          </Link>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: '36px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--primary-light, #818cf8)',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            <ShieldCheck size={14} />
            <span>Quy định vận hành & Pháp lý minh bạch</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
            Điều Khoản Dịch Vụ & Miễn Trừ Trách Nhiệm
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)', margin: 0 }}>
            Cập nhật lần cuối: Tháng 10/2026. Áp dụng cho toàn bộ người dùng và khách hàng của nền tảng TelePulse.
          </p>
        </div>

        {/* Content Container */}
        <div style={{
          background: 'var(--bg-card, rgba(15, 23, 42, 0.7))',
          border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))',
          borderRadius: '16px',
          padding: '36px',
          lineHeight: '1.7',
          fontSize: '14px',
          color: 'var(--text-secondary, #cbd5e1)'
        }}>

          {/* Section 1 */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              1. Định nghĩa và Bản chất dịch vụ
            </h3>
            <p style={{ margin: '0 0 10px 0' }}>
              TelePulse là giải pháp phần mềm dạng dịch vụ (SaaS) cung cấp công cụ tự động hóa tiếp thị, phân tích nhóm và hỗ trợ chăm sóc khách hàng đa tài khoản trên nền tảng Telegram. TelePulse hoạt động như một công cụ hỗ trợ người dùng quản lý tài khoản của chính mình một cách hiệu quả và tiết kiệm thời gian.
            </p>
            <p style={{ margin: 0 }}>
              Bằng việc đăng ký tài khoản, nạp tiền hoặc kích hoạt các gói cước trên TelePulse, bạn xác nhận đã đọc, hiểu và hoàn toàn đồng ý tuân thủ toàn bộ các điều khoản được quy định tại văn bản này.
            </p>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              2. Quyền và Trách nhiệm của Người Dùng
            </h3>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong>Trách nhiệm về nội dung:</strong> Bạn hoàn toàn chịu trách nhiệm pháp lý đối với toàn bộ thông điệp, hình ảnh, liên kết và nội dung tin nhắn được phát tán thông qua tài khoản của bạn.
              </li>
              <li>
                <strong>Nghiêm cấm nội dung độc hại:</strong> Tuyệt đối không sử dụng TelePulse để phát tán nội dung lừa đảo tài chính, cờ bạc phi pháp, mã độc hại, phần mềm gián điệp, khiêu dâm hoặc bất kỳ nội dung nào vi phạm pháp luật hiện hành của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.
              </li>
              <li>
                <strong>Bảo vệ thông tin đăng nhập:</strong> Người dùng có trách nhiệm tự bảo mật tài khoản TelePulse và mật khẩu Telegram hai bước (2FA) của mình.
              </li>
            </ul>
          </div>

          {/* Section 3 - Anti-Spam & Telegram Limits Disclaimer */}
          <div style={{
            marginBottom: '28px',
            padding: '20px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f87171', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>3. Tuyên Bố Miễn Trừ Trách Nhiệm Về Tài Khoản Telegram</span>
            </h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '13.5px', color: '#fca5a5' }}>
              Telegram là một ứng dụng nhắn tin độc lập thuộc quyền sở hữu của Telegram FZ-LLC. Telegram áp dụng các thuật toán tự động chống spam nghiêm ngặt (SpamBot, FloodWait, PeerFlood).
            </p>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px', color: '#fecaca', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                TelePulse tích hợp sẵn các cơ chế bảo vệ tối đa: <strong>Spintax xoay vòng câu chữ</strong>, <strong>Khung giờ tự động nghỉ ban đêm</strong> và <strong>Cảnh báo thời gian giãn cách Delay an toàn</strong>.
              </li>
              <li>
                Tuy nhiên, TelePulse <strong>KHÔNG</strong> bảo đảm và không chịu trách nhiệm trong trường hợp tài khoản Telegram của bạn bị hạn chế gửi tin (Mute), giới hạn tham gia nhóm (FloodWait) hoặc bị khóa tài khoản (Ban) do người dùng cài đặt thời gian quá nhanh, gửi tin phản cảm gây phiền toái hoặc bị thành viên các nhóm bấm nút Báo Cáo (Report Spam).
              </li>
              <li>
                Chúng tôi khuyến nghị khách hàng luôn tuân thủ các mốc thời gian an toàn được hệ thống đề xuất (Giãn cách tối thiểu 120 giây giữa các nhóm).
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              4. Chính Sách Thanh Toán & Nâng Cấp Gói Cước
            </h3>
            <p style={{ margin: '0 0 10px 0' }}>
              - Nền tảng hỗ trợ thanh toán nạp tiền tự động 24/7 thông qua quét mã VietQR ngân hàng. Số dư tài khoản được cộng tức thì vào ví điện tử nội bộ của người dùng.
            </p>
            <p style={{ margin: '0 0 10px 0' }}>
              - Khi bạn bấm xác nhận Nâng cấp VIP Pro, số dư tương ứng sẽ được trừ trực tiếp và gói cước có hiệu lực ngay trong vòng 30 ngày.
            </p>
            <p style={{ margin: 0 }}>
              - <strong>Chính sách hoàn tiền:</strong> Chúng tôi cam kết hỗ trợ kiểm tra và hoàn trả 100% số tiền nếu xảy ra lỗi kỹ thuật phía máy chủ khiến bạn không thể sử dụng dịch vụ sau khi đã chuyển khoản thành công. Vui lòng liên hệ kênh CSKH Zalo/Telegram trong vòng 24 giờ kể từ thời điểm giao dịch.
            </p>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              5. Bảo Mật Dữ Liệu Khách Hàng
            </h3>
            <p style={{ margin: 0 }}>
              Toàn bộ phiên làm việc của tài khoản Telegram được mã hóa theo tiêu chuẩn MTProto an toàn. TelePulse tuyệt đối không lưu trữ mật khẩu ngân hàng, không mua bán hay cung cấp danh sách số điện thoại của bạn cho bất kỳ bên thứ ba nào.
            </p>
          </div>

          {/* Section 6 */}
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc', marginBottom: '10px' }}>
              6. Quyền Hạn Của Ban Quản Trị
            </h3>
            <p style={{ margin: 0 }}>
              Ban quản trị TelePulse bảo lưu quyền tạm đình chỉ hoặc xóa vĩnh viễn tài khoản của bất kỳ người dùng nào cố tình tấn công từ chối dịch vụ (DDoS), khai thác lỗ hổng bảo mật hoặc sử dụng phần mềm vào mục đích lừa đảo chiếm đoạt tài sản mà không cần báo trước và không hoàn tiền.
            </p>
          </div>

        </div>

        {/* Footer Support Info */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted, #94a3b8)' }}>
          Mọi thắc mắc về Điều khoản dịch vụ, vui lòng liên hệ đội ngũ Hỗ trợ CSKH TelePulse qua Zalo hoặc Telegram.
        </div>
      </div>
    </div>
  );
}
