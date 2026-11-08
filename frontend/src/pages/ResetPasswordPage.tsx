import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState<number>(60);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { resetPassword, forgotPassword } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first OTP box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const maskEmail = (rawEmail: string): string => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}@${domain}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = digit;
    setOtpDigits(nextDigits);
    setError(null);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setOtpDigits(nextDigits);
    setError(null);
    const targetFocus = Math.min(pasted.length, 5);
    inputRefs.current[targetFocus]?.focus();
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email để gửi lại mã.');
      return;
    }

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await forgotPassword(email.trim());
      setCooldown(res.resendCooldownSeconds || 60);
      setInfoMessage('Mã OTP mới đã được gửi lại vào email của bạn.');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể gửi lại mã OTP. Vui lòng thử lại sau ít phút.';
      setError(detail);
    } finally {
      setResending(false);
    }
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP xác thực.');
      return;
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      setError('Mật khẩu mới chưa đáp ứng đủ các tiêu chuẩn bảo mật.');
      return;
    }
    if (!passwordsMatch) {
      setError('Mật khẩu nhập lại không trùng khớp với mật khẩu mới.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await resetPassword({
        email: email.trim(),
        otp,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      setIsSuccess(true);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Đặt lại mật khẩu không thành công. Vui lòng kiểm tra lại mã OTP.';
      setError(detail);
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
        padding: '48px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── LOGO & SYSTEM HEADER ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
        <FptEducationLogo />
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginTop: '8px', textAlign: 'center' }}>
          Cổng Ghép nhóm Đa ngành Khởi nghiệp EXE
        </div>
      </div>

      {/* ── CENTERED AUTHENTICATION CARD ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '36px 32px',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            margin: '0 0 4px 0',
          }}
        >
          Đặt lại mật khẩu mới
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px 0' }}>
          Mã xác thực đã được gửi về hòm thư{' '}
          <strong style={{ color: '#0F172A' }}>{maskEmail(email) || 'email của bạn'}</strong>
        </p>

        {isSuccess ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '12px',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', margin: '0 0 6px 0' }}>
              Đặt lại mật khẩu thành công!
            </h3>
            <p style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              Mật khẩu mới của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới này để đăng nhập ngay bây giờ.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                backgroundColor: '#F27024',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
              }}
            >
              Đăng nhập ngay
            </button>
          </div>
        ) : (
          <>
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
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>{error}</div>
              </div>
            )}

            {infoMessage && (
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {infoMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!initialEmail && (
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@fpt.edu.vn"
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
                    }}
                  />
                </div>
              )}

              {/* 6 Digit OTP */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      margin: 0,
                    }}
                  >
                    Mã xác thực OTP (6 chữ số) *
                  </label>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: cooldown > 0 ? '#94A3B8' : '#F27024',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                    <span>{cooldown > 0 ? `Gửi lại (${cooldown}s)` : 'Gửi lại mã'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      disabled={loading}
                      style={{
                        width: '44px',
                        height: '48px',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: digit ? '2px solid #F27024' : '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* New Password */}
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
                  Mật khẩu mới *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      padding: '0 40px 0 14px',
                      fontSize: '14px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '11px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '18px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Xác nhận mật khẩu mới *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
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
                      padding: '0 40px 0 14px',
                      fontSize: '14px',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '11px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      marginTop: '4px',
                      color: passwordsMatch ? '#16A34A' : '#DC2626',
                      fontWeight: 600,
                    }}
                  >
                    {passwordsMatch ? <Check size={14} /> : <X size={14} />}
                    <span>{passwordsMatch ? 'Mật khẩu khớp nhau' : 'Mật khẩu chưa khớp nhau'}</span>
                  </div>
                )}
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
                  boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
                }}
              >
                {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận đặt lại mật khẩu'}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748B' }}>
          <Link
            to="/login"
            style={{
              color: '#64748B',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Quay lại Đăng nhập</span>
          </Link>
        </div>
      </div>

      {/* ── FOOTER COPYRIGHT ── */}
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: '#94A3B8' }}>
        © 2026 Trường Đại học FPT • Hà Nội • TP.HCM • Đà Nẵng • Cần Thơ • Quy Nhơn
      </div>
    </div>
  );
};
