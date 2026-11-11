import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

export interface AnimatedModalProps {
  isOpen?: boolean;
  onClose: () => void;
  maxWidth?: number | string;
  children: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  padding?: string | number;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isOpen = true,
  onClose,
  maxWidth = 480,
  children,
  disabled = false,
  ariaLabel = 'Hộp thoại xác nhận',
  padding = '1.5rem',
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const ctx = gsap.context(() => {
      if (overlayRef.current) {
        gsap.fromTo(
          overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.2, ease: 'power2.out' }
        );
      }
      if (panelRef.current) {
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, scale: 0.96, y: 12 },
          { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'power3.out' }
        );
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disabled) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      ctx.revert();
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, disabled, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={() => {
        if (!disabled) onClose();
      }}
      style={{
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        zIndex: 1200,
      }}
    >
      <div
        ref={panelRef}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth,
          width: '92%',
          padding,
          borderRadius: 'var(--radius-lg, 14px)',
          border: '1px solid var(--border-light, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)',
          boxShadow: '0 20px 40px -12px rgba(15, 23, 42, 0.22)',
        }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  icon,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleDismiss = onCancel ?? onClose ?? (() => {});
  const iconRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const ctx = gsap.context(() => {
      if (iconRef.current) {
        gsap.fromTo(
          iconRef.current,
          { scale: 0.75, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.34, delay: 0.05, ease: 'back.out(1.7)' }
        );
      }
    });
    return () => ctx.revert();
  }, [isOpen]);

  if (!isOpen) return null;

  const themeMap = {
    danger: {
      iconBg: 'rgba(239, 68, 68, 0.12)',
      iconBorder: 'rgba(239, 68, 68, 0.25)',
      iconColor: '#dc2626',
      btnBg: '#dc2626',
      btnBorder: '#dc2626',
      defaultIcon: <AlertCircle size={26} />,
    },
    warning: {
      iconBg: 'rgba(242, 111, 33, 0.12)',
      iconBorder: 'rgba(242, 111, 33, 0.28)',
      iconColor: 'var(--fpt-orange, #f26f21)',
      btnBg: 'var(--fpt-orange, #f26f21)',
      btnBorder: 'var(--fpt-orange, #f26f21)',
      defaultIcon: <AlertCircle size={26} />,
    },
    primary: {
      iconBg: 'var(--accent-soft, rgba(242, 111, 33, 0.12))',
      iconBorder: 'var(--primary-border, rgba(242, 111, 33, 0.28))',
      iconColor: 'var(--accent-color, #f26f21)',
      btnBg: 'var(--accent-color, #f26f21)',
      btnBorder: 'var(--accent-color, #f26f21)',
      defaultIcon: <HelpCircle size={26} />,
    },
    success: {
      iconBg: 'rgba(0, 136, 55, 0.12)',
      iconBorder: 'rgba(0, 136, 55, 0.25)',
      iconColor: 'var(--fpt-green, #008837)',
      btnBg: 'var(--fpt-green, #008837)',
      btnBorder: 'var(--fpt-green, #008837)',
      defaultIcon: <CheckCircle2 size={26} />,
    },
  };

  const currentTheme = themeMap[variant];

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={handleDismiss}
      maxWidth={460}
      disabled={loading}
      ariaLabel={title}
      padding="1.75rem 1.65rem"
    >
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={loading}
          aria-label="Đóng hộp thoại"
          title="Đóng"
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 32,
            height: 32,
            borderRadius: '8px',
            border: '1px solid var(--border-light, #e2e8f0)',
            background: 'var(--bg-main, #f8fafc)',
            color: 'var(--text-muted, #64748b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div
          ref={iconRef}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: currentTheme.iconBg,
            border: `1.5px solid ${currentTheme.iconBorder}`,
            color: currentTheme.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.1rem auto',
          }}
        >
          {icon || currentTheme.defaultIcon}
        </div>

        <h3
          style={{
            margin: '0 0 0.65rem 0',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-main, #0f172a)',
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </h3>

        <div
          style={{
            margin: '0 0 1.5rem 0',
            fontSize: '0.88rem',
            color: 'var(--text-muted, #64748b)',
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.65rem 1rem',
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.65rem 1rem',
              fontWeight: 700,
              background: currentTheme.btnBg,
              borderColor: currentTheme.btnBorder,
              color: '#ffffff',
            }}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
};
