import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogIn,
  Sparkles,
  AlertCircle,
  Mail,
  Lock,
  Lightbulb,
  Zap,
  Users,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setPendingVerificationEmail(null);
    setLoading(true);

    try {
      const authUser = await login(loginEmail, loginPass);
      // Điều hướng theo vai trò thực tế trả về từ Backend JWT
      if (authUser.role === 'Admin') {
        navigate('/admin/accounts');
      } else if (authUser.role === 'Lecturer') {
        navigate('/reports');
      } else {
        navigate('/projects');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      } else if (err.response?.status === 403) {
        const errorCode = err.response?.data?.code;
        const detail = err.response?.data?.detail;
        if (errorCode === 'EMAIL_NOT_CONFIRMED' || (detail && detail.includes('xác thực email'))) {
          setPendingVerificationEmail(loginEmail.trim());
          setError(detail || 'Tài khoản chưa được xác thực email. Vui lòng nhập mã OTP để kích hoạt.');
        } else {
          setError(detail || 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên hệ thống.');
        }
      } else if (err.response?.data?.detail || err.response?.data?.title || err.response?.data?.message) {
        setError(err.response?.data?.detail || err.response?.data?.title || err.response?.data?.message);
      } else {
        setError('Không thể kết nối đến máy chủ xác thực. Vui lòng kiểm tra API Gateway.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    await executeLogin(email, password);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        background: '#f8fafc',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          LEFT COLUMN: FPT EDUCATION SHOWCASE (55%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1.2',
          background: 'radial-gradient(circle at 10% 20%, rgba(0, 84, 166, 0.4) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(242, 111, 33, 0.3) 0%, transparent 50%), #061325',
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
            CỔNG THÔNG TIN KHỞI NGHIỆP MÔN EXE
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}
          >
            Tìm đồng đội đa ngành,<br />
            bứt phá{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #f26f21 0%, #ff9e58 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              dự án khởi nghiệp
            </span>
          </h1>

          <p
            style={{
              fontSize: '0.975rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 540,
              marginBottom: '2.5rem',
            }}
          >
            Hệ thống kết nối sinh viên Đại học FPT thuộc các chuyên ngành Kỹ thuật phần mềm (SE), Trí tuệ nhân tạo (AI), Thiết kế đồ họa (GD), Marketing (MKT) và Kinh doanh quốc tế (IB).
          </p>

          {/* 3 Value Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 540 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(242, 111, 33, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f26f21',
                  flexShrink: 0,
                }}
              >
                <Lightbulb size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  Kho Ý tưởng Dự án EXE phong phú
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Công bố đề tài, tìm giải pháp thực tế và tuyển chọn các vị trí còn thiếu cho đội ngũ.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(0, 84, 166, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  Thuật toán So khớp Matching Score
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Tự động tính toán độ tương thích về kỹ năng, chuyên ngành và sở thích đề tài.
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  flexShrink: 0,
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                  Hợp tác liên ngành chuẩn thực tế
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Trải nghiệm mô hình vận hành nhóm khởi nghiệp thực chiến theo yêu cầu môn EXE.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Campuses List */}
        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Hệ thống áp dụng tại 5 cơ sở FPT University:
          </div>
          <div style={{ fontSize: '0.825rem', color: '#94a3b8', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>Hà Nội</span> • <span>TP. Hồ Chí Minh</span> • <span>Đà Nẵng</span> • <span>Cần Thơ</span> • <span>Quy Nhơn</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: LOGIN FORM & QUICK DEMO (45%)
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
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span className="fpt-portal-badge">FPT SSO PORTAL</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
              Đăng nhập hệ thống
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Vui lòng nhập địa chỉ email của bạn (Gmail, Outlook, FPT Education...)
            </p>
          </div>

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
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {pendingVerificationEmail && (
                <div style={{ paddingLeft: '1.75rem' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/verify-email?email=${encodeURIComponent(pendingVerificationEmail)}`)}
                    style={{
                      background: '#ea580c',
                      color: '#ffffff',
                      border: 'none',
                      padding: '0.4rem 0.8rem',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Nhập mã xác thực OTP ngay &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Địa chỉ Email *
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
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', margin: 0 }}>
                  Mật khẩu *
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: '0.825rem',
                    color: '#f26f21',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
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
              <LogIn size={18} />
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: '#64748b' }}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: '#f26f21', fontWeight: 700 }}>
              Đăng ký ngay
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
