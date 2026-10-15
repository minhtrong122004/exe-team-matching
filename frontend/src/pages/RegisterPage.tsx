import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus,
  AlertCircle,
  Mail,
  Lock,
  User,
  Sparkles,
  Lightbulb,
  Zap,
  Users,
} from 'lucide-react';
import type { UserRole } from '../types';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, fullName, role);
      navigate('/projects');
    } catch (err: any) {
      setError(
        err.response?.data?.title ||
          err.response?.data?.message ||
          'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
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
          background: 'radial-gradient(circle at 10% 20%, rgba(0, 84, 166, 0.4) 0%, transparent 45%), radial-gradient(circle at 90% 80%, rgba(242, 111, 33, 0.3) 0%, transparent 50%), #061325',
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
            CỘNG ĐỒNG KHỞI NGHIỆP TRẺ FPT
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.25,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              marginBottom: '1rem',
            }}
          >
            Gia nhập mạng lưới,<br />
            chinh phục <span style={{ background: 'linear-gradient(90deg, #f26f21 0%, #ff9e58 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>môn học EXE</span>
          </h1>

          <p
            style={{
              fontSize: '0.975rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              maxWidth: 540,
              marginBottom: '2rem',
            }}
          >
            Tạo tài khoản để hoàn thiện hồ sơ kỹ năng cá nhân, đề xuất ý tưởng dự án sáng tạo và nhận lời mời gia nhập từ các nhóm khởi nghiệp xuất sắc.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 540 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Lightbulb size={20} color="#f26f21" />
              <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Đăng tải và bảo vệ ý tưởng dự án của chính mình</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Zap size={20} color="#60a5fa" />
              <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Nhận đề xuất nhóm phù hợp với chuyên ngành SE, GD, MKT, IB</div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Users size={20} color="#34d399" />
              <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>Tương tác trực tiếp với giảng viên hướng dẫn môn học</div>
            </div>
          </div>
        </div>

        {/* Bottom Campuses */}
        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
            Trường Đại học FPT • Hà Nội • TP. HCM • Đà Nẵng • Cần Thơ • Quy Nhơn
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: REGISTER FORM (45%)
         ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          flex: '0.9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 2.5rem',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 440, width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <span className="fpt-portal-badge">ĐĂNG KÝ MỚI</span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>
              Tạo tài khoản thành viên
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Dành cho Sinh viên và Giảng viên Đại học FPT
            </p>
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={18} flex-shrink={0} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Họ và tên *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Email Đại học FPT *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="email"
                  className="form-control"
                  placeholder="anvse123456@fpt.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Mật khẩu *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Vai trò trong hệ thống
              </label>
              <select
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{ height: 44 }}
              >
                <option value="Student">Sinh viên (Student)</option>
                <option value="Lecturer">Giảng viên hướng dẫn (Lecturer)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '0.95rem',
                borderRadius: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <UserPlus size={18} />
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={{ color: '#f26f21', fontWeight: 700 }}>
              Đăng nhập ngay
            </Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            © 2026 Trường Đại học FPT • Hệ sinh thái FPT Education
          </div>
        </div>
      </div>
    </div>
  );
};
