import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldCheck,
  AlertCircle,
  Mail,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isSuccess, setIsSuccess] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Privacy-conscious email mask: e.g. "student@gmail.com" -> "s***t@gmail.com"
  const maskEmail = (rawEmail: string): string => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    return `${name[0]}${'*'.repeat(Math.min(name.length - 2, 4))}${name[name.length - 1]}@${domain}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
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

    // Auto-advance to next box if not the last one
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
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      if (i < pasteData.length) {
        nextDigits[i] = pasteData[i];
      }
    }
    setOtpDigits(nextDigits);
    setError(null);

    const focusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (!email.trim()) {
      setError('Thiếu thông tin địa chỉ email. Vui lòng quay lại trang Đăng ký.');
      return;
    }

    if (fullOtp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await verifyEmail(email.trim(), fullOtp);
      setIsSuccess(true);
      setInfoMessage(res.message || 'Xác thực tài khoản thành công! Đang chuyển hướng...');
      setTimeout(() => {
        navigate(`/login?verified=true&email=${encodeURIComponent(email.trim())}`);
      }, 2500);
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail = data?.detail || data?.message || data?.title;

      if (status === 400) {
        if (detail && detail.includes('lần thử')) {
          setError(detail);
        } else if (detail && detail.includes('hết hạn')) {
          setError('Mã OTP đã hết hạn (quá 5 phút). Vui lòng nhấn "Gửi lại mã OTP" để nhận mã mới.');
        } else if (detail && detail.includes('tối đa')) {
          setError('Đã vượt quá số lần nhập sai cho phép (tối đa 5 lần). Vui lòng nhấn "Gửi lại mã OTP".');
          setAttemptsRemaining(0);
        } else {
          setError(detail || 'Mã OTP không hợp lệ hoặc đã qua sử dụng.');
        }
      } else if (status === 404) {
        setError('Không tìm thấy yêu cầu xác thực cho email này hoặc tài khoản đã được kích hoạt.');
      } else {
        setError(detail || 'Xác thực thất bại. Vui lòng kiểm tra lại đường truyền mạng.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    if (!email.trim()) {
      setError('Thiếu thông tin địa chỉ email.');
      return;
    }

    setResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await resendVerification(email.trim());
      setCooldown(res.resendCooldownSeconds || 60);
      setInfoMessage(res.message || 'Mã OTP mới đã được gửi tới hộp thư của bạn. Vui lòng kiểm tra email.');
      setOtpDigits(['', '', '', '', '', '']);
      setAttemptsRemaining(null);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.title;

      if (status === 429) {
        setError(detail || 'Bạn thao tác quá nhanh. Vui lòng chờ hết thời gian đếm ngược.');
      } else if (status === 400 && detail?.includes('kích hoạt')) {
        setError('Tài khoản này đã được kích hoạt trước đó. Bạn có thể đăng nhập ngay.');
      } else {
        setError(detail || 'Không thể gửi lại mã OTP lúc này. Vui lòng thử lại sau.');
      }
    } finally {
      setResending(false);
    }
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
              padding: '0.4rem 0.9rem',
              background: 'rgba(242, 111, 33, 0.15)',
              border: '1px solid rgba(242, 111, 33, 0.4)',
              borderRadius: '9999px',
              color: '#f97316',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
            }}
          >
            <ShieldCheck size={16} />
            <span>Xác thực Bảo mật Tài khoản</span>
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '1rem',
              letterSpacing: '-0.025em',
            }}
          >
            Bảo vệ tài khoản với <span style={{ color: '#f26f21' }}>Mã xác thực OTP</span>
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: '480px',
            }}
          >
            Hệ thống PRN232 EXE Team Matching sử dụng phương thức gửi mã xác nhận 6 chữ số qua hòm thư điện tử của bạn
            thông qua cổng Brevo Transactional Email nhằm đảm bảo an toàn tuyệt đối.
          </p>

          {/* Security Features */}
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#cbd5e1' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <Clock size={18} />
              </div>
              <span style={{ fontSize: '0.925rem' }}>Mã OTP có hiệu lực tối đa 5 phút kể từ lúc gửi.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#cbd5e1' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f26f21',
                }}
              >
                <Lock size={18} />
              </div>
              <span style={{ fontSize: '0.925rem' }}>Mã hóa một chiều SHA-256 kèm Salt bảo mật, không lưu mã trần.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#cbd5e1' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80',
                }}
              >
                <Sparkles size={18} />
              </div>
              <span style={{ fontSize: '0.925rem' }}>Hỗ trợ mọi hòm thư hợp lệ: Gmail, Outlook, FPT EDU email.</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: '0.825rem',
            color: '#64748b',
          }}
        >
          © 2026 Đại học FPT — Dự án PRN232 EXE Team Matching. All rights reserved.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: OTP VERIFICATION FORM (45%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2.5rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            padding: '2.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(242, 111, 33, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f26f21',
                marginBottom: '1rem',
              }}
            >
              <Mail size={30} />
            </div>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Xác thực địa chỉ Email
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#64748b', lineHeight: 1.5 }}>
              Mã xác nhận 6 chữ số đã được gửi tới địa chỉ:
              <br />
              <strong style={{ color: '#0f172a', fontWeight: 600 }}>{maskEmail(email) || 'email của bạn'}</strong>
            </p>
          </div>

          {/* Success State */}
          {isSuccess && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <CheckCircle2 size={24} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 600, color: '#15803d', fontSize: '0.95rem', margin: 0 }}>
                  Xác thực thành công!
                </p>
                <p style={{ color: '#166534', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                  Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng về trang Đăng nhập...
                </p>
                <div style={{ marginTop: '0.75rem' }}>
                  <Link
                    to={`/login?verified=true&email=${encodeURIComponent(email)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#15803d',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Đăng nhập ngay &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && !isSuccess && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: '#1e40af',
                fontSize: '0.875rem',
              }}
            >
              <Sparkles size={18} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                color: '#b91c1c',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* OTP Input Form */}
          {!isSuccess && (
            <form onSubmit={handleVerify}>
              {/* If email was not passed in URL, allow typing */}
              {!initialEmail && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Địa chỉ email cần xác thực
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: sinhvien@gmail.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.925rem',
                    }}
                  />
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  Nhập mã gồm 6 chữ số
                </label>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      onPaste={handlePaste}
                      disabled={loading || attemptsRemaining === 0}
                      style={{
                        width: '46px',
                        height: '54px',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        color: '#0f172a',
                        border: digit ? '2px solid #f26f21' : '1px solid #cbd5e1',
                        borderRadius: '8px',
                        background: attemptsRemaining === 0 ? '#f1f5f9' : '#ffffff',
                        outline: 'none',
                        transition: 'all 0.15s ease',
                        boxShadow: digit ? '0 0 0 3px rgba(242, 111, 33, 0.12)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background:
                    loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #f26f21 0%, #e05e10 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor:
                    loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(242, 111, 33, 0.25)',
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Đang xác thực...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Xác nhận mã OTP</span>
                  </>
                )}
              </button>

              {/* Resend Cooldown Section */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #f1f5f9',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Chưa nhận được mã OTP trong hòm thư?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 || resending ? '#94a3b8' : '#f26f21',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: cooldown > 0 || resending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
                  <span>
                    {resending
                      ? 'Đang gửi lại...'
                      : cooldown > 0
                      ? `Gửi lại mã (${cooldown}s)`
                      : 'Gửi lại mã OTP'}
                  </span>
                </button>
              </div>

              {/* Helper Links */}
              <div
                style={{
                  marginTop: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#64748b',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Đổi email khác</span>
                </Link>

                <Link
                  to="/login"
                  style={{
                    color: '#0054a6',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Đã kích hoạt? Đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
