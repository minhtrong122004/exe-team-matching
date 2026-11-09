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
  const [ready, setReady] = useState(false);

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
          text: 'signin_with',
          locale: 'vi',
          width: 360,
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current('Không tải được Google Sign-In. Vui lòng kiểm tra kết nối mạng.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}>
      <div ref={containerRef} />
      {!ready && GOOGLE_CLIENT_ID && (
        <span style={{ fontSize: 13, color: '#64748B', alignSelf: 'center' }}>Đang tải Google Sign-In...</span>
      )}
    </div>
  );
};
