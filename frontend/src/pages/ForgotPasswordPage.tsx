import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
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
          maxWidth: '420px',
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
          Khôi phục mật khẩu
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px 0' }}>
          Nhập địa chỉ email tài khoản của bạn để nhận mã xác thực OTP 6 số
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

        {successInfo ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#166534', margin: '0 0 6px 0' }}>
              Đã gửi mã xác thực OTP!
            </h3>
            <p style={{ fontSize: '13px', color: '#15803D', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              {successInfo.message}
            </p>
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px dashed #86EFAC',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '18px',
              }}
            >
              Hòm thư: <strong>{successInfo.email}</strong>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(`/reset-password?email=${encodeURIComponent(successInfo.email)}`)
              }
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(242, 112, 36, 0.25)',
              }}
            >
              <span>Nhập mã OTP và đặt lại mật khẩu</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Địa chỉ Email tài khoản *
              </label>
              <input
                type="email"
                placeholder="sinhvien@fpt.edu.vn hoặc ban@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoFocus
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
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>
                Mã OTP 6 số sẽ được gửi về địa chỉ email này để xác thực quyền chủ sở hữu.
              </div>
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
              {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực OTP'}
            </button>
          </form>
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
