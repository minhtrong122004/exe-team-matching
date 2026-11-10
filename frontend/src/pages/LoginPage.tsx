import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Users,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const HEADING_FONT = '"Plus Jakarta Sans", "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif';
const BODY_FONT = '"Plus Jakarta Sans", "Nunito Sans", "Be Vietnam Pro", sans-serif';

export const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showProcessTooltip, setShowProcessTooltip] = useState<boolean>(false);
  const { loginWithGoogle, loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleCredential = async (idToken: string) => {
    setError(null);
    try {
      const authUser = await loginWithGoogle(idToken);
      if (authUser.role === 'Moderator') {
        navigate('/moderator/spaces');
      } else if (authUser.role === 'Lecturer') {
        navigate('/lecturer/dashboard');
      } else {
        navigate('/groups');
      }
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
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        backgroundImage: `
          radial-gradient(circle at 18% 22%, rgba(242, 112, 36, 0.05) 0%, transparent 45%),
          radial-gradient(circle at 82% 78%, rgba(55, 112, 255, 0.05) 0%, transparent 45%)
        `,
        fontFamily: BODY_FONT,
        color: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 40px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── MAIN STAGE (1.2fr / 0.9fr ratio so left hero title never wraps orphan words) ── */}
      <div
        style={{
          width: '100%',
          maxWidth: '1220px',
          display: 'grid',
          gridTemplateColumns: 'minmax(540px, 1.2fr) minmax(400px, 0.9fr)',
          gap: '48px',
          alignItems: 'center',
        }}
      >
        {/* ════════════════════════════════════════════════════════════════
            CỘT TRÁI: Thương hiệu FPTU + Tiêu đề 2 dòng cân đối + Quả địa cầu 3D
           ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          {/* Logo FPT Education & TRƯỜNG ĐẠI HỌC FPT */}
          <div style={{ marginBottom: '16px' }}>
            <FptEducationLogo />
          </div>

          {/* Tiêu đề chính: Chuẩn 2 dòng gọn gàng, tuyệt đối không rớt chữ lẻ ("Đề / tài", "Đại / học") */}
          <h1
            style={{
              fontFamily: HEADING_FONT,
              fontSize: 'clamp(25px, 2.25vw, 32px)',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.3,
              letterSpacing: '-0.025em',
              margin: '0 0 12px 0',
            }}
          >
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>
              Hệ thống Ghép đội &amp; Kết nối Đề tài
            </span>
            <span
              style={{
                display: 'block',
                color: '#F27024',
                whiteSpace: 'nowrap',
                marginTop: '3px',
              }}
            >
              Khởi nghiệp EXE - Trường Đại học FPT
            </span>
          </h1>

          {/* Mô tả ngắn gọn 2 dòng cân đối, giữ cụm từ tiếng Việt không bị ngắt nửa chừng */}
          <p
            style={{
              fontFamily: BODY_FONT,
              fontSize: '15px',
              color: '#64748B',
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
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <ExeNetworkGlobe />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CỘT PHẢI: Card Đăng nhập phong cách Devfolio (Bo góc mềm, không vạch đỉnh)
           ════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid #EDF2F7',
              boxShadow:
                '0 20px 50px -12px rgba(15, 23, 42, 0.07), 0 4px 16px -4px rgba(15, 23, 42, 0.03)',
              padding: '40px 36px',
              boxSizing: 'border-box',
              position: 'relative',
            }}
          >
            {/* Tiêu đề "Đăng nhập hệ thống" đồng bộ font với tiêu đề chính & mẫu Sign in */}
            <h2
              style={{
                fontFamily: HEADING_FONT,
                fontSize: '30px',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 10px 0',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Đăng nhập hệ thống
            </h2>

            {/* Dòng phụ + Nút nhỏ di chuột xem Quy trình ghép đội */}
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
                  color: '#64748B',
                  fontWeight: 500,
                }}
              >
                Dùng email Google trên FAP.
              </span>

              {/* Nút nhỏ di chuột vào để xem Quy trình ghép đội */}
              <div
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={() => setShowProcessTooltip(true)}
                onMouseLeave={() => setShowProcessTooltip(false)}
              >
                <button
                  type="button"
                  onClick={() => setShowProcessTooltip((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: showProcessTooltip ? '#EFF6FF' : '#F8FAFC',
                    color: '#2563EB',
                    border: `1px solid ${showProcessTooltip ? '#BFDBFE' : '#E2E8F0'}`,
                    borderRadius: '999px',
                    padding: '4px 11px',
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: BODY_FONT,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <HelpCircle size={14} />
                  <span>Quy trình ghép đội</span>
                </button>

                {/* Tooltip Popover hiện ra khi di chuột vào */}
                {showProcessTooltip && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 10px)',
                      right: 0,
                      width: '300px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow:
                        '0 20px 40px -10px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.05)',
                      padding: '16px',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: HEADING_FONT,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#0F172A',
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
                          color: '#334155',
                          lineHeight: 1.45,
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2
                          size={15}
                          color="#2563EB"
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
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  padding: '11px 14px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  color: '#DC2626',
                  fontSize: '13px',
                  lineHeight: 1.45,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* Nút Google Sign-In chuẩn thiết kế Devfolio ("Continue with Google") */}
            <GoogleSignInButton
              onCredential={handleCredential}
              onError={(msg) => setError(msg)}
            />

            {/* Cụm nút Demo xếp dọc chuẩn bố cục Devfolio */}
            {loginDemo && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    margin: '22px 0',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#EDF2F7' }} />
                  <span
                    style={{
                      fontFamily: HEADING_FONT,
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#94A3B8',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    HOẶC TRẢI NGHIỆM NHANH
                  </span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#EDF2F7' }} />
                </div>

                {/* 3 Nút bo góc 12px xếp dọc đầy đặn như ảnh mẫu Devfolio */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Nút 1: Student */}
                  <button
                    type="button"
                    onClick={() => {
                      loginDemo('Student');
                      navigate('/groups');
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '0 20px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontFamily: BODY_FONT,
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F27024';
                      e.currentTarget.style.backgroundColor = '#FFFBF7';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Users size={19} color="#F27024" style={{ flexShrink: 0 }} />
                    <span>Tiếp tục với vai trò Student (Tú)</span>
                  </button>

                  {/* Nút 2: Moderator */}
                  <button
                    type="button"
                    onClick={() => {
                      loginDemo('Moderator');
                      navigate('/moderator/spaces');
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '0 20px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontFamily: BODY_FONT,
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = '#F8FAFF';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <ShieldCheck size={19} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span>Tiếp tục với vai trò Moderator</span>
                  </button>

                  {/* Nút 3: Lecturer */}
                  <button
                    type="button"
                    onClick={() => {
                      loginDemo('Lecturer');
                      navigate('/lecturer/dashboard');
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '0 20px',
                      backgroundColor: '#FFFFFF',
                      color: '#1E293B',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontFamily: BODY_FONT,
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#059669';
                      e.currentTarget.style.backgroundColor = '#F6FEF9';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <GraduationCap size={19} color="#059669" style={{ flexShrink: 0 }} />
                    <span>Tiếp tục với vai trò Lecturer</span>
                  </button>
                </div>
              </>
            )}

            {/* Dòng chú thích ngắn gọn ở đáy card */}
            <p
              style={{
                marginTop: '24px',
                marginBottom: 0,
                textAlign: 'center',
                fontSize: '12.5px',
                color: '#94A3B8',
                lineHeight: 1.55,
                fontWeight: 500,
              }}
            >
              Chính sách FAP: Chỉ email sinh viên do{' '}
              <span style={{ color: '#2563EB', fontWeight: 600 }}>Điều phối viên</span> đồng bộ từ
              FAP mới đăng nhập được.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
