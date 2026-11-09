import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldCheck, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
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
          (err.response ? 'Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản Google.' : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra API Gateway.')
      );
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
      <div
        style={{
          width: '100%',
          maxWidth: '1160px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        {/* ── LEFT COLUMN: FPT Identity & 3D Interactive Globe ── */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div style={{ marginBottom: '16px' }}>
            <FptEducationLogo />
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.25,
              margin: '0 0 10px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Hệ thống Ghép đội & Kết nối Đề tài
            <span style={{ color: '#F27024', display: 'block' }}>Khởi nghiệp EXE - Trường Đại học FPT</span>
          </h1>

          <p
            style={{
              fontSize: '14.5px',
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '560px',
              margin: '0 0 12px 0',
            }}
          >
            Nền tảng chính thức hỗ trợ sinh viên 5 cơ sở FPTU tự do kết nối đa ngành nghề, ghép nhóm khởi nghiệp đề tài EXE101/EXE201 và đồng bộ học vụ trực tiếp từ FAP.
          </p>

          {/* 3D Dotted Interactive Globe */}
          <div style={{ margin: '8px 0' }}>
            <ExeNetworkGlobe />
          </div>
        </div>

        {/* ── RIGHT COLUMN: Google Login Card ── */}
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
              Đăng nhập bằng tài khoản Google trùng với email của bạn trên FAP
            </p>

            {error && (
              <div
                role="alert"
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
                  overflowWrap: 'anywhere',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <GoogleSignInButton onCredential={handleCredential} onError={setError} />

            <div
              style={{
                marginTop: '20px',
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                fontSize: '12.5px',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <ShieldCheck size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: '#0F172A' }}>Chính sách FAP:</strong> Chỉ email có trong danh sách sinh viên do Điều phối viên (Moderator) đồng bộ từ FAP mới đăng nhập được.
              </div>
            </div>
          </div>

          {/* Quick Demo Role Switcher */}
          {loginDemo && (
            <div
              style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #E2E8F0',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '11px',
                  color: '#64748B',
                  fontWeight: 600,
                  marginBottom: '8px',
                  textAlign: 'center',
                }}
              >
                Đăng nhập nhanh theo vai trò (Chế độ Trải nghiệm & Demo):
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
                    navigate('/moderator/spaces');
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
                    navigate('/lecturer/dashboard');
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
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
