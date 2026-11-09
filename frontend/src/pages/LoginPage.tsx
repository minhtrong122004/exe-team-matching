import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FptEducationLogo } from '../components/FptEducationLogo';
import { ExeNetworkGlobe } from '../components/ExeNetworkGlobe';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export const LoginPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleCredential = async (idToken: string) => {
    setError(null);
    setLoading(true);
    try {
      const authUser = await loginWithGoogle(idToken);
      navigate(authUser.role === 'Moderator' ? '/admin/accounts' : authUser.role === 'Lecturer' ? '/spaces' : '/projects');
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.title ||
          (err.response ? 'Không thể đăng nhập. Vui lòng thử lại.' : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra API Gateway.')
      );
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

        {/* ── RIGHT COLUMN (lg:col-span-5): Login Card ── */}
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

            {loading && (
              <p style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', margin: '12px 0 0' }}>
                Đang đăng nhập...
              </p>
            )}

            {/* Thông báo chính sách cấp tài khoản từ danh sách FAP (BR-01) */}
            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                color: '#475569',
                lineHeight: 1.45,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <ShieldCheck size={16} color="#0054A6" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ color: '#0F172A' }}>Chính sách FAP (BR-01):</strong> Chỉ email có trong danh sách sinh viên do Điều phối viên (Moderator) đồng bộ từ FAP mới đăng nhập được.
              </div>
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
