import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let scriptPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Không tải được Google Sign-In.'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
};

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Giữ callback mới nhất mà không phải khởi tạo lại nút Google mỗi lần render.
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      onErrorRef.current('Chưa cấu hình Google Client ID (VITE_GOOGLE_CLIENT_ID).');
      return;
    }

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          locale: 'vi',
          width: 380,
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current('Không tải được Google Sign-In. Vui lòng kiểm tra kết nối mạng.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: hovered ? '#F8FAFC' : '#FFFFFF',
        border: `1px solid ${hovered ? '#CBD5E1' : '#E2E8F0'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '0 20px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered ? '0 4px 12px rgba(15, 23, 42, 0.04)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Giao diện hiển thị chuẩn mẫu Devfolio ("Continue with Google") ── */}
      <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path
          fill="#4285F4"
          d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.685h6.445c-.28 1.5-1.125 2.775-2.395 3.625v3.015h3.875c2.265-2.085 3.565-5.16 3.565-8.85Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.015c-1.075.72-2.45 1.15-4.065 1.15-3.125 0-5.775-2.11-6.72-4.945H1.275v3.11C3.25 21.315 7.31 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.28A7.21 7.21 0 0 1 4.9 12c0-.795.135-1.565.38-2.28V6.61H1.275A11.99 11.99 0 0 0 0 12c0 1.935.465 3.765 1.275 5.39l4.005-3.11Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.685 1.275 6.61l4.005 3.11c.945-2.835 3.595-4.945 6.72-4.945Z"
        />
      </svg>

      <span
        style={{
          fontFamily: '"Plus Jakarta Sans", "Nunito Sans", "Be Vietnam Pro", sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          color: '#1E293B',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Tiếp tục với Google
      </span>

      {/* ── Lớp tương tác Google Identity Services ẩn phía trên (giữ 100% luồng OAuth thật) ── */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.0001,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transform: 'scale(1.15)',
        }}
      />
    </div>
  );
};
