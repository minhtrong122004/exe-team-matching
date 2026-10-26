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
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { FptEducationLogo } from '../components/FptEducationLogo';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    if (fullName.trim().length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ (ví dụ: ban@gmail.com hoặc sinhvien@fpt.edu.vn).');
      return false;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ cái in hoa (A-Z).');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một chữ số (0-9).');
      return false;
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      setError('Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*...).');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await register(email, password, fullName);
      const targetEmail = res?.email || email.trim();
      navigate(`/verify-email?email=${encodeURIComponent(targetEmail)}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.');
      } else if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat();
        setError(errorList.join(' ') || 'Thông tin đăng ký không hợp lệ.');
      } else {
        setError(
          err.response?.data?.detail ||
            err.response?.data?.title ||
            err.response?.data?.message ||
            'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin kết nối.'
        );
      }
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
              color: '#f97316',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              letterSpacing: '0.02em',
            }}
          >
            <Sparkles size={16} />
            <span>KHỞI ĐẦU HÀNH TRÌNH KHỞI NGHIỆP EXE</span>
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: '-0.025em',
              marginBottom: '1.25rem',
              color: '#ffffff',
            }}
          >
            Đăng ký tài khoản sinh viên FPT
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.6,
              color: '#94a3b8',
              maxWidth: 500,
              marginBottom: '2.5rem',
            }}
          >
            Tạo hồ sơ năng lực, tìm kiếm đồng đội ăn ý và cùng nhau phát triển các đề tài khởi nghiệp xuất sắc tại Đại học FPT.
          </p>

          {/* Value Props 3 Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 480 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.9rem 1.2rem',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(242, 111, 33, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f97316',
                }}
              >
                <Lightbulb size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Đề tài EXE Đa dạng</div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Khám phá các ý tưởng EdTech, FinTech, E-Commerce</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.9rem 1.2rem',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(0, 84, 166, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <Zap size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ghép nhóm thông minh</div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Gợi ý thành viên và nhóm đề tài tối ưu theo chuyên môn</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0.9rem 1.2rem',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Bảo mật & Quyền riêng tư</div>
                <div style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Bảo vệ thông tin cá nhân và email của sinh viên</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Campus Badge */}
        <div style={{ position: 'relative', zIndex: 1, fontSize: '0.825rem', color: '#64748b' }}>
          Hà Nội • TP. Hồ Chí Minh • Đà Nẵng • Quy Nhơn • Cần Thơ
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT COLUMN: REGISTER FORM (45%)
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
        <div style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
              Tạo tài khoản mới
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Điền thông tin để đăng ký tài khoản sinh viên FPT
            </p>
          </div>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: 10,
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                color: '#b91c1c',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{error}</div>
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
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Địa chỉ Email *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="email"
                  className="form-control"
                  placeholder="sinhvien@fpt.edu.vn hoặc ban@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', marginBottom: 0 }}>
                Hệ thống hỗ trợ Gmail, Outlook, FPT Education và các địa chỉ email hợp lệ khác.
              </p>
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
                  placeholder="Tối thiểu 8 ký tự (chữ hoa, số, ký tự đặc biệt)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                Ví dụ: <code style={{ color: '#f26f21', fontWeight: 600 }}>Abc@123456</code>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                Xác nhận mật khẩu *
              </label>
              <div style={{ position: 'relative' }}>
                <CheckCircle2 size={18} style={{ position: 'absolute', left: 14, top: 13, color: '#94a3b8' }} />
                <input
                  type="password"
                  className="form-control"
                  placeholder="Nhập lại mật khẩu ở trên"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  style={{ paddingLeft: '2.6rem', height: 44 }}
                  required
                />
              </div>
            </div>

            {/* Thông báo phân quyền: Cổng công khai chỉ dành cho Sinh viên */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: '0.825rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Shield size={16} style={{ color: '#0054a6', flexShrink: 0 }} />
              <div>
                Tài khoản mặc định là <strong style={{ color: '#f26f21' }}>Sinh viên (Student)</strong>. Giảng viên vui lòng liên hệ Quản trị viên để được cấp tài khoản.
              </div>
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
