import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from '../../utils/icons';

/**
 * Thành phần giao diện dùng chung cho các màn hình Học kỳ / Phòng / Nhóm.
 * Giữ đúng phong cách giao diện mới (thẻ trắng bo 20px, nút màu nhấn theo tùy chỉnh giao diện).
 */

export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="motion-page-enter" style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
    {children}
  </div>
);

export const PageHeader: React.FC<{
  section: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ section, title, description, actions }) => (
  <div
    style={{
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: 'var(--text-muted, #64748B)', marginBottom: 6 }}>
        <span>{section}</span>
        <span style={{ color: 'var(--text-light, #CBD5E1)' }}>/</span>
        <span style={{ color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>{title}</span>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 650, color: 'var(--text-main, #0F172A)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      {description && (
        <p style={{ color: 'var(--text-muted, #64748B)', fontSize: 14.5, margin: 0, lineHeight: 1.5 }}>{description}</p>
      )}
    </div>
    {actions && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: number | string;
}> = ({ children, style, padding = 24 }) => (
  <div
    style={{
      backgroundColor: 'var(--bg-card, #FFFFFF)',
      border: '1px solid var(--border-light, #E2E8F0)',
      borderRadius: 20,
      padding,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<{
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ icon, title, subtitle, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {icon && (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'var(--bg-subtle, #F8FAFC)',
            border: '1px solid var(--border-light, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-color, #F26F21)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 17, fontWeight: 750, color: 'var(--text-main, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 14, color: 'var(--text-muted, #64748B)' }}>{subtitle}</span>}
      </div>
    </div>
    {right}
  </div>
);

type ButtonVariant = 'primary' | 'dark' | 'outline' | 'danger' | 'ghost';

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean; icon?: React.ReactNode; block?: boolean }
> = ({ variant = 'primary', loading, icon, block, children, disabled, style, ...rest }) => {
  const palette: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
      color: '#FFFFFF',
      border: 'none',
      boxShadow: '0 2px 6px var(--accent-shadow, rgba(242, 111, 33, 0.25))',
    },
    dark: { backgroundColor: '#0F172A', color: '#FFFFFF', border: 'none' },
    outline: {
      backgroundColor: 'var(--bg-card, #FFFFFF)',
      color: 'var(--text-main, #0F172A)',
      border: '1px solid var(--border-medium, #CBD5E1)',
    },
    danger: { backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
    ghost: { backgroundColor: 'transparent', color: 'var(--text-muted, #64748B)', border: '1px solid transparent' },
  };
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      className="motion-btn"
      disabled={isDisabled}
      style={{
        height: 42,
        padding: '0 16px',
        borderRadius: 12,
        fontSize: 14.5,
        fontWeight: 650,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        width: block ? '100%' : undefined,
        transition: 'opacity 0.15s ease',
        ...palette[variant],
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner size={15} /> : icon}
      {children}
    </button>
  );
};

export const Spinner: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span
    aria-label="Đang tải"
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border: '2px solid currentColor',
      borderRightColor: 'transparent',
      display: 'inline-block',
      animation: 'exe-spin 0.7s linear infinite',
      flexShrink: 0,
    }}
  >
    <style>{'@keyframes exe-spin { to { transform: rotate(360deg); } }'}</style>
  </span>
);

export const Pill: React.FC<{ children: React.ReactNode; dot?: string; tone?: 'neutral' | 'accent' }> = ({
  children,
  dot,
  tone = 'neutral',
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      backgroundColor: tone === 'accent' ? 'var(--accent-color, #F26F21)' : 'var(--bg-subtle, #F8FAFC)',
      color: tone === 'accent' ? '#FFFFFF' : 'var(--text-secondary, #334155)',
      border: tone === 'accent' ? 'none' : '1px solid var(--border-light, #E2E8F0)',
    }}
  >
    {dot && <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: dot, flexShrink: 0 }} />}
    {children}
  </span>
);

export const ROOM_STATUS_DOT: Record<string, string> = {
  Empty: '#94A3B8',
  Forming: '#F59E0B',
  Recruiting: '#10B981',
  Closed: '#6366F1',
  Locked: '#0F172A',
  Disbanded: '#EF4444',
  Pending: '#F59E0B',
  Accepted: '#10B981',
  Approved: '#10B981',
  Rejected: '#EF4444',
  Cancelled: '#94A3B8',
};

/** Ô trạng thái rỗng / đang tải / lỗi, dùng thay cho dữ liệu mẫu khi chưa có dữ liệu thật. */
export const StateBox: React.FC<{
  kind: 'loading' | 'empty' | 'error';
  title?: string;
  message?: React.ReactNode;
  action?: React.ReactNode;
}> = ({ kind, title, message, action }) => (
  <div
    style={{
      padding: '36px 24px',
      textAlign: 'center',
      color: 'var(--text-muted, #64748B)',
      border: '1px dashed var(--border-medium, #CBD5E1)',
      borderRadius: 16,
      backgroundColor: 'var(--bg-subtle, #F8FAFC)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: kind === 'error' ? '#DC2626' : 'var(--text-light, #94A3B8)' }}>
      {kind === 'loading' ? <Spinner size={22} /> : kind === 'error' ? <AlertCircle size={26} /> : null}
    </div>
    {title && <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: 6 }}>{title}</div>}
    {message && <div style={{ fontSize: 14.5, lineHeight: 1.55, maxWidth: 620, margin: '0 auto' }}>{message}</div>}
    {action && <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>{action}</div>}
  </div>
);

export const Banner: React.FC<{ tone?: 'success' | 'error' | 'info' | 'warning'; children: React.ReactNode }> = ({
  tone = 'info',
  children,
}) => {
  const tones = {
    success: { bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.25)', color: '#047857' },
    error: { bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' },
    info: { bg: 'var(--bg-subtle, #F8FAFC)', border: 'var(--border-light, #E2E8F0)', color: 'var(--text-secondary, #334155)' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
  }[tone];
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 12,
        backgroundColor: tones.bg,
        border: `1px solid ${tones.border}`,
        color: tones.color,
        fontSize: 14.5,
        fontWeight: 550,
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: '1rem',
      }}
    >
      {tone === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />}
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
};

export interface ToastState {
  message: string;
  tone: 'success' | 'error';
}

/** Thông báo nổi góc màn hình, tự ẩn sau vài giây. */
export const useToast = () => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((message: string, tone: ToastState['tone'] = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 6000 : 4000);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const node = toast ? (
    <div
      role="status"
      className="motion-dropdown-panel"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 'min(520px, calc(100vw - 32px))',
        backgroundColor: toast.tone === 'error' ? '#B91C1C' : '#059669',
        color: '#FFFFFF',
        padding: '12px 16px',
        borderRadius: 12,
        boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 1.45,
      }}
    >
      {toast.tone === 'error' ? <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => setToast(null)}
        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
      >
        <X size={16} />
      </button>
    </div>
  ) : null;
  return { show, node };
};

export const Modal: React.FC<{
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}> = ({ open, title, subtitle, onClose, children, footer, width = 560 }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="motion-dropdown-panel"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          borderRadius: 18,
          border: '1px solid var(--border-light, #E2E8F0)',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.35)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 19, fontWeight: 750, color: 'var(--text-main, #0F172A)', margin: 0 }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 14, color: 'var(--text-muted, #64748B)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748B)', padding: 4, display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>
  );
};

export const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--border-medium, #CBD5E1)',
  backgroundColor: 'var(--bg-input, #FFFFFF)',
  color: 'var(--text-main, #0F172A)',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

export const Field: React.FC<{ label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: 7 }}>{label}</span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted, #64748B)', marginTop: 5 }}>{hint}</span>}
  </label>
);

/** Thanh tiến độ sĩ số chia ô theo số chỗ tối đa. */
export const SeatBar: React.FC<{ count: number; max: number }> = ({ count, max }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(max, 1)}, 1fr)`, gap: 4 }}>
    {Array.from({ length: Math.max(max, 1) }, (_, i) => (
      <div
        key={i}
        style={{
          height: 5,
          borderRadius: 999,
          backgroundColor: i < count ? 'var(--accent-color, #F26F21)' : 'var(--border-light, #E2E8F0)',
        }}
      />
    ))}
  </div>
);

export const SKILL_KEYS = [
  { key: 'techScore', label: 'Tech' },
  { key: 'managementScore', label: 'Management' },
  { key: 'graphicDesignScore', label: 'Graphic Design' },
  { key: 'marketingScore', label: 'Marketing' },
  { key: 'saleScore', label: 'Sale' },
] as const;

export type SkillScores = Record<(typeof SKILL_KEYS)[number]['key'], number>;

/** Điểm trung bình 5 kỹ năng của một nhóm người. */
export const averageSkills = (people: Partial<SkillScores>[]): SkillScores => {
  const result = { techScore: 0, managementScore: 0, graphicDesignScore: 0, marketingScore: 0, saleScore: 0 };
  if (people.length === 0) return result;
  for (const { key } of SKILL_KEYS) {
    result[key] = Math.round(people.reduce((sum, p) => sum + (p[key] ?? 0), 0) / people.length);
  }
  return result;
};

export const SkillBars: React.FC<{ scores: SkillScores }> = ({ scores }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {SKILL_KEYS.map(({ key, label }) => (
      <div key={key}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary, #334155)' }}>{label}</span>
          <span style={{ fontWeight: 700, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>{scores[key]}/100</span>
        </div>
        <div style={{ height: 7, borderRadius: 999, backgroundColor: 'var(--border-light, #E2E8F0)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, Math.max(0, scores[key]))}%`,
              height: '100%',
              borderRadius: 999,
              background: 'var(--accent-gradient, var(--accent-color, #F26F21))',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>
    ))}
  </div>
);

export const Table: React.FC<{ headers: React.ReactNode[]; children: React.ReactNode; minWidth?: number }> = ({ headers, children, minWidth = 720 }) => (
  <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
    <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', textAlign: 'left', fontSize: 14.5 }}>
      <thead>
        <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)', whiteSpace: 'nowrap' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const td: React.CSSProperties = {
  padding: '11px 14px',
  borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
  color: 'var(--text-main, #0F172A)',
  verticalAlign: 'middle',
};

/** Thông báo khi chưa có không gian môn học nào được chọn. */
export const NoSpaceState: React.FC<{ loading: boolean; error: string | null; role?: string; action?: React.ReactNode }> = ({
  loading,
  error,
  role,
  action,
}) => {
  if (loading) return <StateBox kind="loading" message="Đang tải không gian môn học..." />;
  if (error) return <StateBox kind="error" title="Không tải được dữ liệu" message={error} />;
  return (
    <StateBox
      kind="empty"
      title="Chưa có không gian môn học"
      message={
        role === 'Student'
          ? 'Bạn chưa có tên trong danh sách FAP của môn học nào. Vui lòng liên hệ Điều phối viên để được thêm vào danh sách.'
          : role === 'Moderator'
          ? 'Hãy tạo không gian môn học đầu tiên, sau đó tải danh sách sinh viên FAP lên.'
          : 'Điều phối viên chưa tạo không gian môn học nào.'
      }
      action={action}
    />
  );
};
