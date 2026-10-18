import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Bot, MessageSquare, CheckCircle2, TrendingUp, Users } from 'lucide-react';

export default function LandingHero({ onAuthClick, onPricingClick }) {
  return (
    <section style={{
      position: 'relative',
      padding: '70px 24px 60px',
      overflow: 'hidden'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '800px',
        height: '500px',
        background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.18) 0%, rgba(168, 85, 247, 0.08) 45%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center'
      }}>
        {/* Top Tag Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          color: '#a5b4fc',
          fontSize: '13px',
          fontWeight: '700',
          marginBottom: '24px',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.15)'
        }}>
          <Sparkles size={16} color="#818cf8" />
          <span>GIẢI PHÁP TIẾP THỊ & TỰ ĐỘNG HÓA TELEGRAM CHUYÊN NGHIỆP</span>
        </div>

        {/* Main Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 5.5vw, 56px)',
          fontWeight: '900',
          lineHeight: '1.15',
          letterSpacing: '-1.2px',
          margin: '0 auto 20px',
          maxWidth: '960px',
          color: 'var(--text-main)'
        }}>
          Vận Hành <span style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>Hạm Đội Bot Telegram</span> Thông Minh & Tiếp Cận Khách Hàng Tự Động
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          color: 'var(--text-secondary)',
          margin: '0 auto 36px',
          maxWidth: '740px',
          lineHeight: '1.6'
        }}>
          Nền tảng SaaS đồng bộ 10 tài khoản bot MTProto, quét nhóm thảo luận tự động một chạm, thuật toán Spintax biến thiên né FloodWait và hộp thư Live Chat 2 chiều tức thì.
        </p>

        {/* Call to Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '50px'
        }}>
          <button
            type="button"
            onClick={() => onAuthClick('register')}
            className="btn btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: '15px',
              fontWeight: '700',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              cursor: 'pointer'
            }}
          >
            <Zap size={18} />
            <span>Trải Nghiệm Miễn Phí Ngay</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={onPricingClick}
            className="btn btn-secondary"
            style={{
              padding: '14px 26px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <span>Xem Bảng Giá Gói VIP</span>
          </button>
        </div>

        {/* Trust Points */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '28px',
          flexWrap: 'wrap',
          color: 'var(--text-muted)',
          fontSize: '13px',
          marginBottom: '56px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>Không cần tải ứng dụng / chạy máy ảo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>Mã hóa bảo mật phiên MTProto an toàn</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="var(--success)" />
            <span>Nạp tiền tự động qua VietQR PayOS</span>
          </div>
        </div>

        {/* Interactive UI Mockup Showcase */}
        <div style={{
          position: 'relative',
          maxWidth: '1020px',
          margin: '0 auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: '20px',
          padding: 'clamp(14px, 3vw, 24px)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden'
        }}>
          {/* Top Window Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            paddingBottom: '14px',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                telepulse.io/dashboard • MTProto Fleet Engine v2.0
              </span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--success)',
              fontSize: '10px',
              fontWeight: '700',
              flexShrink: 0
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
              <span>HỆ THỐNG TRỰC TUYẾN</span>
            </div>
          </div>

          {/* Mockup Dashboard Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '14px',
            textAlign: 'left'
          }}>
            {/* Box 1: Fleet Accounts */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} color="#818cf8" />
                  Hạm Đội Tài Khoản Bot
                </span>
                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>3/3 Online</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span>+84 912 *** 889 (Marketing 01)</span>
                  <span style={{ color: 'var(--success)' }}>● Sẵn sàng</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span>+84 983 *** 421 (Support Bot)</span>
                  <span style={{ color: 'var(--success)' }}>● Đang rải tin</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <span>+84 905 *** 112 (Lead Finder)</span>
                  <span style={{ color: 'var(--success)' }}>● Sẵn sàng</span>
                </div>
              </div>
            </div>

            {/* Box 2: Spintax Engine */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={16} color="#c084fc" />
                  Soạn Thảo Spintax Biến Thiên
                </span>
                <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: '600' }}>Random 100%</span>
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '10px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#e2e8f0',
                lineHeight: '1.5',
                borderLeft: '3px solid #c084fc'
              }}>
                {"{Chào bạn|Hello quý khách|Kính chào đối tác}, dự án TelePulse giúp {tiết kiệm 80% thời gian|tăng gấp 5 lần tương tác} Telegram!"}
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                ✓ Đã kích hoạt cơ chế Smart Delay né chống Spam Telegram
              </div>
            </div>

            {/* Box 3: Live Chat Response */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#fbbf24" />
                  Live Chat 2 Chiều VIP
                </span>
                <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '600' }}>Realtime</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px' }}>
                  <strong style={{ color: '#818cf8' }}>@hoanglong:</strong> Cho mình xin báo giá chi tiết gói VIP với ạ!
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', alignSelf: 'flex-end' }}>
                  <strong style={{ color: '#fbbf24' }}>Bạn:</strong> Dạ gói VIP 199k/tháng kích hoạt ngay lập tức qua VietQR ạ!
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
