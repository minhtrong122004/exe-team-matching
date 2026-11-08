import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    if (fullName.trim().length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ (ví dụ: ban@gmail.com hoặc sinhvien@fpt.edu.vn).');
      return false;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ cái in hoa (A-Z).');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ số (0-9).');
      return false;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...).');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await register(email, password, fullName);
      const targetEmail = res?.email || email.trim();
      navigate(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.');
      } else if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        setError(errorList.join(' ') || 'Thông tin đăng ký không hợp lệ.');
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.title ||
            err.response?.data?.message ||
            'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin kết nối.'
        );
      }
    } finally {
      setLoading(false);
    }
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

        {/* ── RIGHT COLUMN (lg:col-span-5): Register Card ── */}
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
              Tạo tài khoản mới
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
              Điền thông tin để đăng ký tài khoản sinh viên FPT
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
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '18px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{error}</div>
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
                  Họ và tên *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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
                  Mật khẩu *
                </label>
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
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Tối thiểu 8 ký tự (Ví dụ: <span style={{ color: '#64748B', fontWeight: 600 }}>Abc@123456</span>)
                </div>
              </div>

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
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

              {/* Clean Role Note */}
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '18px' }}>
                * Tài khoản mặc định là <strong>Sinh viên</strong>. Giảng viên vui lòng liên hệ Ban Đào tạo / Quản trị viên để được cấp tài khoản.
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
                  marginTop: '4px',
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
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: '#F27024', fontWeight: 600, textDecoration: 'none' }}>
                Đăng nhập ngay
              </Link>
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
