import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from '../utils/icons';
import { useAuth } from '../contexts/AuthContext';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const HEADING_FONT = '"Plus Jakarta Sans", "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif';
const BODY_FONT = '"Plus Jakarta Sans", "Nunito Sans", "Be Vietnam Pro", sans-serif';

export const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showProcessTooltip, setShowProcessTooltip] = useState<boolean>(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const navigateByRole = (role: string) => {
    if (role === 'Moderator') {
      navigate('/moderator/spaces');
    } else if (role === 'Lecturer') {
      navigate('/lecturer/dashboard');
    } else {
      navigate('/groups');
    }
  };

  const handleCredential = async (idToken: string) => {
    setError(null);
    try {
      const authUser = await loginWithGoogle(idToken);
      navigateByRole(authUser.role);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          (err.response
            ? 'Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản Google.'
            : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra API Gateway.')
      );
    }
  };

  return (
    <div
      className="login-page-shell"
      style={{
        backgroundColor: 'var(--bg-body, #F8FAFC)',
        backgroundImage: `
          radial-gradient(circle at 18% 22%, rgba(242, 112, 36, 0.05) 0%, transparent 45%),
          radial-gradient(circle at 82% 78%, rgba(15, 23, 42, 0.03) 0%, transparent 45%)
        `,
        fontFamily: BODY_FONT,
        color: 'var(--text-main, #0F172A)',
      }}
    >
      {/* ── MAIN STAGE (1.2fr / 0.9fr ratio on desktop, responsive single-column stack on <1080px) ── */}
      <div className="login-main-grid">
        {/* ════════════════════════════════════════════════════════════════
            CỘT TRẢI: Thương hiệu FPTU + Tiêu đề 2 dòng cân đối + Quả địa cầu 3D
           ════════════════════════════════════════════════════════════════ */}
        <div className="login-hero-col">
          {/* Logo FPT Education & TRƯỜNG ĐẠI HỌC FPT */}
          <div style={{ marginBottom: '16px' }}>
            <FptEducationLogo />
          </div>

          {/* Tiêu đề chính: Chuẩn 2 dòng gọn gàng trên Desktop, tự xuống dòng mượt trên Mobile */}
          <h1
            style={{
              fontFamily: HEADING_FONT,
              fontSize: 'clamp(22px, 2.25vw, 32px)',
              fontWeight: 700,
              color: 'var(--text-main, #0F172A)',
              lineHeight: 1.3,
              letterSpacing: '-0.025em',
              margin: '0 0 12px 0',
            }}
          >
            <span className="login-hero-line">
              Hệ thống Ghép đội &amp; Kết nối Đề tài
            </span>
            <span
              className="login-hero-line"
              style={{
                color: '#F27024',
                marginTop: '3px',
              }}
            >
              Khởi nghiệp EXE - Trường Đại học FPT
            </span>
          </h1>

          {/* Mô tả ngắn gọn 2 dòng cân đối */}
          <p
            style={{
              fontFamily: BODY_FONT,
              fontSize: 'clamp(13.5px, 1.1vw, 15px)',
              color: 'var(--text-muted, #64748B)',
              lineHeight: 1.6,
              margin: '0 0 8px 0',
              maxWidth: '560px',
              fontWeight: 500,
            }}
          >
            Nền tảng chính thức hỗ trợ sinh viên 5 cơ sở FPTU tự do kết nối đa&nbsp;ngành&nbsp;nghề,
            ghép nhóm khởi nghiệp đề tài EXE101/EXE201 và đồng bộ học vụ trực&nbsp;tiếp từ&nbsp;FAP.
          </p>

          {/* Quả địa cầu 3D tương tác 5 cơ sở */}
          <div className="login-globe-scale-wrap">
            <ExeNetworkGlobe />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CỘT PHẢI: Card Đăng nhập phong cách Devfolio (Bo góc mềm, không vạch đỉnh)
           ════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minWidth: 0 }}>
          <div
            className="login-card-shell"
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              borderRadius: '24px',
              border: '1px solid var(--border-light, #E2E8F0)',
              boxShadow:
                '0 20px 50px -12px rgba(15, 23, 42, 0.07), 0 4px 16px -4px rgba(15, 23, 42, 0.03)',
              padding: '40px 36px',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Tiêu đề "Đăng nhập hệ thống" đồng bộ font với tiêu đề chính */}
            <h2
              style={{
                fontFamily: HEADING_FONT,
                fontSize: 'clamp(24px, 2vw, 29px)',
                fontWeight: 700,
                color: 'var(--text-main, #0F172A)',
                margin: '0 0 10px 0',
                letterSpacing: '-0.025em',
                lineHeight: 1.22,
              }}
            >
              Đăng nhập hệ thống
            </h2>

            {/* Dòng phụ + Nút nhỏ xem Quy trình ghép đội */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '26px',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: '14.5px',
                  color: 'var(--text-muted, #64748B)',
                  fontWeight: 500,
                }}
              >
                Dùng email Google trên FAP.
              </span>

              <div
                style={{ display: 'inline-block' }}
                onMouseEnter={() => setShowProcessTooltip(true)}
                onMouseLeave={() => setShowProcessTooltip(false)}
              >
                <button
                  type="button"
                  aria-expanded={showProcessTooltip}
                  onClick={() => setShowProcessTooltip((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: showProcessTooltip ? 'rgba(242, 111, 33, 0.10)' : 'var(--bg-subtle, #F8FAFC)',
                    color: showProcessTooltip ? '#EA580C' : 'var(--text-secondary, #334155)',
                    border: `1px solid ${showProcessTooltip ? 'rgba(242, 111, 33, 0.35)' : 'var(--border-light, #E2E8F0)'}`,
                    borderRadius: '999px',
                    padding: '4.5px 11px',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: BODY_FONT,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <HelpCircle size={14} color={showProcessTooltip ? '#EA580C' : 'var(--text-muted, #64748B)'} />
                  <span>Quy trình ghép đội</span>
                </button>

                {showProcessTooltip && (
                  <div
                    role="tooltip"
                    className="login-process-popover motion-dropdown-panel"
                    style={{
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      borderRadius: '16px',
                      border: '1px solid var(--border-light, #E2E8F0)',
                      boxShadow:
                        '0 20px 40px -10px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.05)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: HEADING_FONT,
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-main, #0F172A)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      3 Bước ghép nhóm EXE
                    </div>

                    {[
                      '1. Đăng nhập bằng Google trùng email FAP',
                      '2. Khai báo bộ kỹ năng cá nhân (Tech, Design, Biz...)',
                      '3. Vào thẳng Room (<3 SV) hoặc nộp đơn Apply',
                    ].map((stepText, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '12.5px',
                          color: 'var(--text-secondary, #334155)',
                          lineHeight: 1.45,
                          fontWeight: 500,
                        }}
                      >
                        <CheckCircle2
                          size={15}
                          color="#F27024"
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        />
                        <span>{stepText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Thông báo lỗi nếu có */}
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.10)',
                  border: '1px solid rgba(239, 68, 68, 0.28)',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: 'var(--danger, #DC2626)',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Nút Google Sign-In chuẩn thiết kế Devfolio */}
            <GoogleSignInButton
              onCredential={handleCredential}
              onError={(msg) => setError(msg)}
            />

            {/* Dòng chú thích ngắn gọn ở đáy card */}
            <p
              style={{
                marginTop: '24px',
                marginBottom: 0,
                textAlign: 'center',
                fontSize: '12.5px',
                color: 'var(--text-light, #94A3B8)',
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              Chính sách FAP: Chỉ email sinh viên do{' '}
              <span style={{ color: 'var(--text-secondary, #334155)', fontWeight: 600 }}>Điều phối viên</span> đồng bộ từ
              FAP mới đăng nhập được.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
