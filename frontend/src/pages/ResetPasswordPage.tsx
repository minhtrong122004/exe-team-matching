import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
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

    const nextFocusIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
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
      setInfoMessage('Mã OTP mới đã được gửi thành công đến email của bạn.');
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể gửi lại mã vào lúc này. Vui lòng thử lại sau.';
      setError(detail);
    } finally {
      setResending(false);
    }
  };

  // Password requirements calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

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
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          LEFT COLUMN: FPT EDUCATION SHOWCASE (50%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1.1',
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <FptEducationLogo />
        </div>

        <div style={{ position: 'relative', zIndex: 1, margin: '2.5rem 0' }}>
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
            TIÊU CHUẨN AN TOÀN FPT
          </div>

          <h1
            style={{
              fontSize: '2.3rem',
              fontWeight: 800,
              lineHeight: 1.3,
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Thiết lập mật khẩu bảo vệ tài khoản của bạn
          </h1>

          <p
            style={{
              fontSize: '1rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 500,
              marginBottom: '2rem',
            }}
          >
            Vui lòng nhập mã OTP 6 chữ số đã được gửi qua email kèm mật khẩu mới có độ bảo mật cao.
            Mọi phiên đăng nhập cũ trên các thiết bị khác sẽ được tự động thu hồi ngay khi bạn hoàn tất.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '1.25rem',
              borderRadius: 14,
              maxWidth: 480,
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
              Quy chuẩn mật khẩu an toàn:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: hasMinLength ? '#4ade80' : '#94a3b8' }}>
                  {hasMinLength ? <Check size={16} /> : <span style={{ display: 'inline-block', width: 16 }}>•</span>}
                </span>
                <span>Tối thiểu 8 ký tự</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: hasUpper && hasLower ? '#4ade80' : '#94a3b8' }}>
                  {hasUpper && hasLower ? <Check size={16} /> : <span style={{ display: 'inline-block', width: 16 }}>•</span>}
                </span>
                <span>Bao gồm cả chữ hoa và chữ thường</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: hasDigit ? '#4ade80' : '#94a3b8' }}>
                  {hasDigit ? <Check size={16} /> : <span style={{ display: 'inline-block', width: 16 }}>•</span>}
                </span>
                <span>Chứa ít nhất 1 chữ số (0-9)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: hasSpecial ? '#4ade80' : '#94a3b8' }}>
                  {hasSpecial ? <Check size={16} /> : <span style={{ display: 'inline-block', width: 16 }}>•</span>}
                </span>
                <span>Chứa ký tự đặc biệt (!@#$%^&*...)</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
            Trường Đại học FPT • Khởi nghiệp & Đổi mới sáng tạo (EXE)
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: RESET PASSWORD FORM (50%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2.5rem',
          background: '#ffffff',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        <div style={{ maxWidth: 460, width: '100%' }}>
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
              }}
            >
              <ArrowLeft size={16} /> Quay lại Đăng nhập
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <span className="fpt-portal-badge">ĐẶT LẠI MẬT KHẨU</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              Nhập mã OTP & Mật khẩu mới
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Mã xác thực đã được gửi về hòm thư{' '}
              <strong style={{ color: '#0f172a' }}>{maskEmail(email) || 'email của bạn'}</strong>.
            </p>
          </div>

          {/* Success Banner */}
          {isSuccess ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '2rem 1.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
                Đặt lại mật khẩu thành công!
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#15803d', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Mật khẩu mới của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới này để đăng nhập ngay bây giờ.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  borderRadius: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldCheck size={18} />
                <span>Đăng nhập ngay</span>
              </button>
            </div>
          ) : (
            <>
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
                    marginBottom: '1.25rem',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Info Message */}
              {infoMessage && (
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '0.85rem 1rem',
                    borderRadius: 10,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* Email field if not prepopulated */}
                {!initialEmail && (
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                      Địa chỉ Email *
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ban@fpt.edu.vn"
                      required
                      style={{ height: 42 }}
                    />
                  </div>
                )}

                {/* 6-digit OTP Inputs */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.5rem' }}
                  >
                    Mã xác thực OTP (6 chữ số) *
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
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
                          width: '100%',
                          height: 52,
                          textAlign: 'center',
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          borderRadius: 10,
                          border: digit ? '2px solid #f26f21' : '1.5px solid #cbd5e1',
                          background: digit ? '#fff7ed' : '#ffffff',
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                  </div>

                  {/* Resend button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0 || resending}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: cooldown > 0 ? '#94a3b8' : '#f26f21',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={13} className={resending ? 'spin' : ''} />
                      {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã OTP'}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                    Mật khẩu mới *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Ít nhất 8 ký tự, gồm HOA, thường, số, ký tự đặc biệt"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      style={{ paddingLeft: '2.6rem', paddingRight: '2.6rem', height: 44 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                    Nhập lại mật khẩu mới *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: '#94a3b8' }} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Nhập lại chính xác mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      style={{ paddingLeft: '2.6rem', paddingRight: '2.6rem', height: 44 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 12,
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
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
                        gap: '0.35rem',
                        fontSize: '0.775rem',
                        marginTop: '0.4rem',
                        color: passwordsMatch ? '#16a34a' : '#dc2626',
                        fontWeight: 600,
                      }}
                    >
                      {passwordsMatch ? <Check size={14} /> : <X size={14} />}
                      {passwordsMatch ? 'Mật khẩu khớp nhau' : 'Mật khẩu chưa khớp nhau'}
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.95rem',
                    borderRadius: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <ShieldCheck size={18} />
                  {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận đặt lại mật khẩu'}
                </button>
              </form>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
            Hủy khôi phục?{' '}
            <Link to="/login" style={{ color: '#f26f21', fontWeight: 700, textDecoration: 'none' }}>
              Trở về Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
