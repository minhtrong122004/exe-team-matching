import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  KeyRound,
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Send,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    email: string;
    cooldown: number;
  } | null>(null);

  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await forgotPassword(email.trim());
      setSuccessInfo({
        message: response.message,
        email: response.email,
        cooldown: response.resendCooldownSeconds || 60,
      });
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng kiểm tra lại địa chỉ email hoặc thử lại sau ít phút.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          LEFT COLUMN: FPT EDUCATION SHOWCASE (55%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1.2',
          background:
            'radial-gradient(circle at 10% 20%, rgba(0, 84, 166, 0.4) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(242, 111, 33, 0.3) 0%, transparent 50%), #061325',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          color: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Decorative Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FptEducationLogo />
        </div>

        {/* Center Hero Information */}
        <div style={{ position: 'relative', zIndex: 1, margin: '3rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.95rem',
              borderRadius: 9999,
              background: 'rgba(242, 111, 33, 0.15)',
              border: '1px solid rgba(242, 111, 33, 0.35)',
              color: '#fba46e',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '1.5rem',
            }}
          >
            <Sparkles size={15} color="#f26f21" />
            KHÔI PHỤC TÀI KHOẢN AN TOÀN
          </div>

          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Bảo vệ an toàn thông tin & phiên đăng nhập của bạn
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 520,
              marginBottom: '2rem',
            }}
          >
            Hệ thống gửi mã xác thực OTP 6 số qua email của bạn bằng dịch vụ Brevo Transactional Email.
            Mật khẩu mới yêu cầu độ phức tạp cao nhằm đảm bảo tính toàn vẹn dữ liệu đề tài và nhóm dự án.
          </p>

          {/* Security Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.85rem 1.1rem',
                borderRadius: 12,
              }}
            >
              <KeyRound size={20} color="#f26f21" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>
                  Xác thực mã OTP dùng một lần
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                  Mã OTP 6 chữ số có hiệu lực trong 5 phút và tự động hủy sau khi sử dụng.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.85rem 1.1rem',
                borderRadius: 12,
              }}
            >
              <ShieldAlert size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f1f5f9' }}>
                  Thu hồi toàn bộ phiên đăng nhập cũ
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                  Tất cả Refresh Token đang kích hoạt sẽ bị hủy bỏ ngay khi mật khẩu được đổi mới.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Campuses List */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '1.5rem',
          }}
        >
          <div
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.4rem',
            }}
          >
            Hệ thống quản lý nhóm khởi nghiệp môn EXE Đại học FPT:
          </div>
          <div style={{ fontSize: '0.825rem', color: '#94a3b8', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>Hà Nội</span> • <span>TP. Hồ Chí Minh</span> • <span>Đà Nẵng</span> • <span>Cần Thơ</span> • <span>Quy Nhơn</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: FORGOT PASSWORD FORM (45%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '0.9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 2.5rem',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 440, width: '100%' }}>
          {/* Back link */}
          <div style={{ marginBottom: '1.5rem' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                color: '#64748b',
                textDecoration: 'none',
                fontWeight: 600,
                transition: 'color 0.15s ease',
              }}
            >
              <ArrowLeft size={16} /> Quay lại Đăng nhập
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span className="fpt-portal-badge">QUÊN MẬT KHẨU</span>
            </div>
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '0.4rem',
                letterSpacing: '-0.02em',
              }}
            >
              Khôi phục mật khẩu
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Nhập địa chỉ email tài khoản của bạn để nhận mã xác thực OTP 6 số.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Success State */}
          {successInfo ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '1.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
                Đã gửi mã xác thực OTP!
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#15803d', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                {successInfo.message}
              </p>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px dashed #86efac',
                  padding: '0.75rem',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: '#334155',
                  marginBottom: '1.5rem',
                }}
              >
                Hòm thư: <strong>{successInfo.email}</strong>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  navigate(`/reset-password?email=${encodeURIComponent(successInfo.email)}`)
                }
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '0.95rem',
                  borderRadius: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>Nhập mã OTP và đặt lại mật khẩu</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  Địa chỉ Email đăng ký *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="sinhvien@fpt.edu.vn hoặc ban@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{ paddingLeft: '2.6rem', height: 44 }}
                    required
                    autoFocus
                  />
                </div>
                <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Mã OTP 6 số sẽ được gửi về địa chỉ email này qua Brevo.
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '0.95rem',
                  borderRadius: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Send size={18} />
                {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực OTP'}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
            Nhớ mật khẩu?{' '}
            <Link to="/login" style={{ color: '#f26f21', fontWeight: 700, textDecoration: 'none' }}>
              Đăng nhập ngay
            </Link>
          </div>

          {/* Footer Copyright */}
          <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            © 2026 Trường Đại học FPT • Hệ sinh thái FPT Education
          </div>
        </div>
      </div>
    </div>
  );
};
