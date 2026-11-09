import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Users,
  X,
  Mail,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const { login, loginDemo, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setPendingVerificationEmail(null);
    setLoading(true);

    try {
      const authUser = await login(loginEmail, loginPass);
      // Điều hướng theo vai trò thực tế trả về từ Backend JWT
      if ((authUser.role as string) === 'Admin' || authUser.role === 'Moderator') {
        navigate('/spaces');
      } else if (authUser.role === 'Lecturer') {
        navigate('/reports');
      } else {
        navigate('/groups');
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
              padding: '32px 28px',
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
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px 0' }}>
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
              <div style={{ marginBottom: '14px' }}>
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

              <div style={{ marginBottom: '18px' }}>
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
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotSuccess(null);
                      setForgotStep(1);
                      setShowForgotModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '12px',
                      color: '#F27024',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    Quên mật khẩu?
                  </button>
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
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Hướng dẫn tài khoản FAP */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                color: '#64748B',
                lineHeight: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <ShieldCheck size={16} color="#F27024" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Dành cho sinh viên có tên trong danh sách học kỳ từ hệ thống FAP. Vui lòng đăng nhập bằng email trường (@fpt.edu.vn) và mật khẩu khởi tạo đã gửi qua email.
              </span>
            </div>
          </div>

          {/* ── CHẾ ĐỘ KIỂM TRA UI NHANH (BỎ QUA BACKEND) ── */}
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              marginTop: '14px',
              boxSizing: 'border-box',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {/* Nút 1: Student (Tú - SE185102) */}
              <button
                type="button"
                onClick={() => {
                  loginDemo('Student');
                  navigate('/groups');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
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
                <Users size={16} color="#F27024" />
                <span>Student (Tú)</span>
              </button>

              {/* Nút 2: Moderator (Điều phối) */}
              <button
                type="button"
                onClick={() => {
                  loginDemo('Moderator');
                  navigate('/spaces');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0054A6';
                  e.currentTarget.style.color = '#0054A6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                <ShieldCheck size={16} color="#0054A6" />
                <span>Moderator</span>
              </button>

              {/* Nút 3: Lecturer (Giảng viên) */}
              <button
                type="button"
                onClick={() => {
                  loginDemo('Lecturer');
                  navigate('/reports');
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '8px 6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#008837';
                  e.currentTarget.style.color = '#008837';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.color = '#0F172A';
                }}
              >
                <GraduationCap size={16} color="#008837" />
                <span>Lecturer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL QUÊN MẬT KHẨU ── */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#F27024" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                  {forgotStep === 1 ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#64748B',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Error & Success Messages */}
            {forgotError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontSize: '12px',
                  marginBottom: '14px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#16A34A',
                  fontSize: '12px',
                  marginBottom: '14px',
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* Bước 1: Nhập email nhận OTP */}
            {forgotStep === 1 ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail.trim()) {
                    setForgotError('Vui lòng nhập địa chỉ email trường (@fpt.edu.vn).');
                    return;
                  }
                  setForgotError(null);
                  setForgotLoading(true);
                  try {
                    await forgotPassword(forgotEmail);
                    setForgotSuccess('Đã gửi mã OTP khôi phục! Vui lòng kiểm tra email trường hoặc MailHog.');
                    setForgotStep(2);
                  } catch (err: any) {
                    setForgotError(err.response?.data?.detail || err.response?.data?.title || 'Không tìm thấy tài khoản với email này.');
                  } finally {
                    setForgotLoading(false);
                  }
                }}
              >
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Nhập địa chỉ email trường (<strong>@fpt.edu.vn</strong>) để nhận mã xác thực OTP đặt lại mật khẩu.
                </p>

                {/* Ghi chú MailHog */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: '#475569',
                    marginBottom: '16px',
                    lineHeight: 1.45,
                  }}
                >
                  💡 <strong>Kiểm tra hộp thư local:</strong> Mã OTP được gửi đến MailHog tại{' '}
                  <a
                    href="http://localhost:8025"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#F27024', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    http://localhost:8025
                  </a>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Địa chỉ Email FPT *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: 12, top: 13, color: '#94A3B8' }} />
                    <input
                      type="email"
                      placeholder="vidu@fpt.edu.vn"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={forgotLoading}
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        padding: '0 12px 0 38px',
                        fontSize: '13px',
                        color: '#0F172A',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#F27024',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {forgotLoading ? 'Đang gửi OTP...' : 'Gửi mã OTP'}
                  </button>
                </div>
              </form>
            ) : (
              /* Bước 2: Nhập OTP + Đặt lại mật khẩu */
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotOtp.trim() || !forgotNewPass || !forgotConfirmPass) {
                    setForgotError('Vui lòng điền đầy đủ mã OTP và mật khẩu mới.');
                    return;
                  }
                  if (forgotNewPass !== forgotConfirmPass) {
                    setForgotError('Mật khẩu xác nhận không trùng khớp.');
                    return;
                  }
                  setForgotError(null);
                  setForgotLoading(true);
                  try {
                    await resetPassword({
                      email: forgotEmail,
                      otp: forgotOtp,
                      newPassword: forgotNewPass,
                      confirmNewPassword: forgotConfirmPass,
                    });
                    setForgotSuccess('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
                    setTimeout(() => {
                      setShowForgotModal(false);
                      setPassword(forgotNewPass);
                      setEmail(forgotEmail);
                    }, 1500);
                  } catch (err: any) {
                    setForgotError(err.response?.data?.detail || err.response?.data?.title || 'Mã OTP không đúng hoặc đã hết hạn.');
                  } finally {
                    setForgotLoading(false);
                  }
                }}
              >
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  Nhập mã OTP 6 số đã gửi đến <strong>{forgotEmail}</strong> và mật khẩu mới của bạn.
                </p>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mã xác thực OTP (6 chữ số) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    disabled={forgotLoading}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '15px',
                      letterSpacing: '4px',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 8 ký tự, có số, chữ hoa"
                    value={forgotNewPass}
                    onChange={(e) => setForgotNewPass(e.target.value)}
                    disabled={forgotLoading}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={forgotConfirmPass}
                    onChange={(e) => setForgotConfirmPass(e.target.value)}
                    disabled={forgotLoading}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      padding: '0 12px',
                      fontSize: '13px',
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#64748B',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    ← Quay lại bước 1
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#F27024',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {forgotLoading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER COPYRIGHT ── */}
      <div style={{ textAlign: 'center', marginTop: '36px', fontSize: '12px', color: '#94A3B8' }}>
        © 2026 Trường Đại học FPT • Hà Nội • TP.HCM • Đà Nẵng • Cần Thơ • Quy Nhơn
      </div>
    </div>
  );
};
