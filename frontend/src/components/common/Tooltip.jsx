import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip component hiển thị popover thông tin mượt mà, không bị cắt bởi overflow của thẻ cha.
 * Tự động điều chỉnh vị trí để không tràn ra ngoài màn hình.
 */
export default function Tooltip({ 
  text, 
  children, 
  className = '', 
  maxWidth = 400, 
  placement = 'top' 
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, isBelow: false });
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (!text) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const shouldShowBelow = placement === 'bottom' || spaceAbove < 50;
        
        // Căn lề trái không để tràn sang phải màn hình
        const screenWidth = window.innerWidth;
        let leftPos = rect.left;
        if (leftPos + maxWidth > screenWidth - 16) {
          leftPos = Math.max(16, screenWidth - maxWidth - 16);
        }

        setPos({
          top: shouldShowBelow ? rect.bottom + 6 : rect.top - 6,
          left: leftPos,
          isBelow: shouldShowBelow
        });
        setVisible(true);
      }
    }, 120);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={text} // Fallback chuẩn trình duyệt
        style={{ display: 'inline-block', maxWidth: '100%', minWidth: 0, verticalAlign: 'middle' }}
      >
        {children}
      </span>

      {visible && text && createPortal(
        <div
          className="telepulse-tooltip-popover"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: pos.isBelow ? 'none' : 'translateY(-100%)',
            zIndex: 99999,
            maxWidth: `${maxWidth}px`
          }}
        >
          {text}
        </div>,
        document.body
      )}
    </>
  );
}
