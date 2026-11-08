import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
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
    const targetFocus = Math.min(pasteData.length, 5);
    inputRefs.current[targetFocus]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('').trim();
    if (otp.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    if (!email.trim()) {
      setError('Thiếu thông tin địa chỉ email cần xác thực.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      await verifyEmail(email.trim(), otp);
      setIsSuccess(true);
      setTimeout(() => {
        navigate(`/login?verified=true&email=${encodeURIComponent(email.trim())}`);
      }, 1500);
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.response?.data?.message || err.response?.data?.title;

      if (status === 400 && (detail?.includes('không chính xác') || detail?.includes('hết hạn'))) {
        setError(detail || 'Mã xác nhận OTP không chính xác hoặc đã hết hạn.');
        setAttemptsRemaining((prev) => (prev !== null ? Math.max(prev - 1, 0) : 4));
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
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════
          LEFT COLUMN: CLEAN ARCHITECTURAL & PRODUCT SHOWCASE
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="auth-left-column"
        style={{
          flex: '1.2',
          backgroundColor: '#F8FAFC',
          borderRight: '1px solid #E2E8F0',
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <FptEducationLogo />
        </div>

        <div style={{ position: 'relative', zIndex: 1, margin: '2rem 0' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#64748B',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            FPT UNIVERSITY • EXPERIENTIAL ENTREPRENEURSHIP
          </div>

          <h1
            style={{
              fontSize: '34px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: '#0F172A',
              marginBottom: '1rem',
            }}
          >
            Bảo vệ tài khoản với <span style={{ color: '#F27024' }}>mã xác thực OTP</span>
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#64748B',
              lineHeight: 1.6,
              maxWidth: 500,
              marginBottom: '2rem',
            }}
          >
            Hệ thống PRN232 EXE Team Matching sử dụng phương thức xác nhận 6 chữ số qua hòm thư điện tử nhằm đảm bảo an toàn tuyệt đối cho hồ sơ của bạn.
          </p>

          {/* Interactive UI Showcase Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '24px',
              boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.07)',
              maxWidth: 500,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Dự án đề cử môn EXE
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  EcoCampus – Phân loại rác thông minh AI
                </h3>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  border: '1px solid #A7F3D0',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981' }} />
                96% Phù hợp
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="avatar-pastel-0"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    NT
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Lữ Phước Nhật Tú</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>SE185102 • Kỹ thuật phần mềm (SE)</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#F27024', backgroundColor: 'rgba(242, 111, 33, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                  Trưởng nhóm
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="avatar-pastel-2"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    TV
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Trần Thảo Vy</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>GD185201 • Thiết kế đồ họa (GD)</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                  Thành viên
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    className="avatar-pastel-3"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '12px',
                      flexShrink: 0,
                    }}
                  >
                    HP
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Hoàng Đình Phú</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>MK185301 • Marketing (MKT)</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                  Thành viên
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
            Hệ thống áp dụng tại 5 cơ sở FPT University
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>Hà Nội</span> • <span>TP. Hồ Chí Minh</span> • <span>Đà Nẵng</span> • <span>Cần Thơ</span> • <span>Quy Nhơn</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: OTP VERIFICATION FORM (45%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        className="auth-right-column"
        style={{
          flex: '0.9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 2.5rem',
          backgroundColor: '#FFFFFF',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 400, width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              Xác thực địa chỉ Email
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              Mã xác nhận 6 chữ số đã được gửi tới:
              <br />
              <strong style={{ color: '#0F172A', fontWeight: 600 }}>{maskEmail(email) || 'email của bạn'}</strong>
            </p>
          </div>

          {/* Success State */}
          {isSuccess && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 600, color: '#15803D', fontSize: '14px', margin: 0 }}>
                  Xác thực thành công!
                </p>
                <p style={{ color: '#166534', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Tài khoản đã được kích hoạt. Đang chuyển hướng về trang Đăng nhập...
                </p>
              </div>
            </div>
          )}

          {/* Info Banner */}
          {infoMessage && !isSuccess && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '1.25rem',
                color: '#1E40AF',
                fontSize: '13px',
              }}
            >
              {infoMessage}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                color: '#DC2626',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* OTP Input Form */}
          {!isSuccess && (
            <form onSubmit={handleVerify}>
              {!initialEmail && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Địa chỉ email cần xác thực
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: sinhvien@fpt.edu.vn"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
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

              {/* 6 Digit Input Boxes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '10px',
                    textAlign: 'center',
                  }}
                >
                  Nhập mã OTP gồm 6 chữ số
                </label>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
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
                        width: '44px',
                        height: '50px',
                        fontSize: '22px',
                        fontWeight: 700,
                        textAlign: 'center',
                        color: '#0F172A',
                        border: digit ? '2px solid #F27024' : '1px solid #E2E8F0',
                        borderRadius: '10px',
                        backgroundColor: attemptsRemaining === 0 ? '#F8FAFC' : '#FFFFFF',
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
                  height: '44px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '14px',
                  backgroundColor:
                    loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0
                      ? '#CBD5E1'
                      : '#F27024',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor:
                    loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0
                      ? 'not-allowed'
                      : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow:
                    loading || otpDigits.join('').length !== 6 || attemptsRemaining === 0
                      ? 'none'
                      : '0 2px 8px rgba(242, 112, 36, 0.25)',
                }}
              >
                {loading ? 'Đang xác thực...' : 'Xác nhận mã OTP'}
              </button>

              {/* Resend Cooldown Section */}
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid #F1F5F9',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '6px' }}>
                  Chưa nhận được mã OTP trong hòm thư?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: cooldown > 0 || resending ? '#94A3B8' : '#F27024',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: cooldown > 0 || resending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
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
                  fontSize: '13px',
                  color: '#64748B',
                }}
              >
                <Link
                  to="/register"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#64748B',
                    textDecoration: 'none',
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Đổi email khác</span>
                </Link>

                <Link
                  to="/login"
                  style={{
                    color: '#F27024',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Đăng nhập
                </Link>
              </div>
            </form>
          )}

          {/* Footer Copyright */}
          <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '12px', color: '#94A3B8' }}>
            © 2026 Trường Đại học FPT • Hệ sinh thái FPT Education
          </div>
        </div>
      </div>
    </div>
  );
};
