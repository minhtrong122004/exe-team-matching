import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = (role: 'Student' | 'Lecturer' | 'Admin') => {
    loginDemo(role);
    if (role === 'Admin') {
      navigate('/admin/accounts');
    } else if (role === 'Lecturer') {
      navigate('/reports');
    } else {
      navigate('/projects');
    }
  };

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
        width: '100%',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '36px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 2-COLUMN SPLIT SHOWCASE CONTAINER ── */}
      <div
        className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        style={{
          maxWidth: '1150px',
          margin: '0 auto',
        }}
      >
        {/* ── LEFT COLUMN (lg:col-span-7): EXE Network Showcase + 3D Globe ── */}
        <div className="lg:col-span-7 flex flex-col justify-between py-2">
          {/* Header */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FptEducationLogo />
              <div
                style={{
                  height: '24px',
                  width: '1px',
                  backgroundColor: '#CBD5E1',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748B',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Cổng Ghép nhóm Đa ngành Khởi nghiệp EXE
              </span>
            </div>

            <h1
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                marginTop: '16px',
                lineHeight: 1.25,
              }}
            >
              Mạng lưới Ghép nhóm Khởi nghiệp Đa ngành
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                marginTop: '8px',
                maxWidth: '520px',
                lineHeight: 1.55,
              }}
            >
              Kết nối sinh viên các chuyên ngành SE, AI, IA, GD, MKT, IB để hình thành đội ngũ dự án thực chiến môn Experiential Entrepreneurship (EXE).
            </p>
          </div>

          {/* 3D Dotted Interactive Globe */}
          <div style={{ margin: '8px 0' }}>
            <ExeNetworkGlobe />
          </div>
        </div>

        {/* ── RIGHT COLUMN (lg:col-span-5): Login Card + Quick Demo ── */}
        <div className="lg:col-span-5 flex flex-col items-center w-full">
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '36px 32px',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                margin: '0 0 4px 0',
              }}
            >
              Đăng nhập hệ thống
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
              Vui lòng nhập thông tin tài khoản của bạn để tiếp tục
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
                {pendingVerificationEmail && (
                  <div style={{ paddingLeft: '24px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/verify-email?email=${encodeURIComponent(pendingVerificationEmail)}`)}
                      style={{
                        backgroundColor: '#EA580C',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
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

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Địa chỉ Email *
                </label>
                <input
                  type="email"
                  placeholder="sinhvien@fpt.edu.vn hoặc ban@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0F172A';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #0F172A';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      margin: 0,
                    }}
                  >
                    Mật khẩu *
                  </label>
                  <Link
                    to="/forgot-password"
                    style={{
                      fontSize: '12px',
                      color: '#F27024',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    padding: '0 14px',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0F172A';
                    e.currentTarget.style.boxShadow = '0 0 0 1px #0F172A';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor: '#F27024',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  marginTop: '8px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#EA580C';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = '#F27024';
                  }
                }}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ color: '#F27024', fontWeight: 600, textDecoration: 'none' }}>
                Đăng ký ngay
              </Link>
            </div>
          </div>

          {/* ── QUICK DEMO BAR (Bỏ qua Backend) ── */}
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#F1F5F9',
              borderRadius: '12px',
              padding: '12px 16px',
              border: '1px solid #E2E8F0',
              marginTop: '16px',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#64748B',
                textTransform: 'uppercase',
                marginBottom: '8px',
                display: 'block',
                textAlign: 'center',
                letterSpacing: '0.04em',
              }}
            >
              Chế độ kiểm tra UI nhanh (Bỏ qua Backend):
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleDemoLogin('Student')}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F27024';
                  e.currentTarget.style.color = '#F27024';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                Sinh viên (Tú)
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('Lecturer')}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F27024';
                  e.currentTarget.style.color = '#F27024';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                Giảng viên
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('Admin')}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F27024';
                  e.currentTarget.style.color = '#F27024';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                Quản trị viên
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER COPYRIGHT ── */}
      <div style={{ textAlign: 'center', marginTop: '36px', fontSize: '12px', color: '#94A3B8' }}>
        © 2026 Trường Đại học FPT • Hà Nội • TP.HCM • Đà Nẵng • Cần Thơ • Quy Nhơn
      </div>
    </div>
  );
};
