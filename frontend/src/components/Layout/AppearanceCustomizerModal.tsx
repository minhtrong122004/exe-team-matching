import React, { useRef } from 'react';
import { Check, X } from '../../utils/icons';

export interface AccentColorOption {
  id: string;
  name: string;
  hex: string;
  hoverHex: string;
  rgb: string;
}

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { id: 'royal-blue', name: 'Royal Blue', hex: '#2563EB', hoverHex: '#1D4ED8', rgb: '37, 99, 235' },
  { id: 'sky-blue', name: 'Sky Blue', hex: '#3B82F6', hoverHex: '#2563EB', rgb: '59, 130, 246' },
  { id: 'teal-mint', name: 'Teal Mint', hex: '#10B981', hoverHex: '#059669', rgb: '16, 185, 129' },
  { id: 'emerald-green', name: 'Emerald Green', hex: '#22C55E', hoverHex: '#16A34A', rgb: '34, 197, 94' },
  { id: 'violet', name: 'Soft Violet', hex: '#8B5CF6', hoverHex: '#7C3AED', rgb: '139, 92, 246' },
  { id: 'deep-purple', name: 'Deep Purple', hex: '#7C3AED', hoverHex: '#6D28D9', rgb: '124, 58, 237' },
  { id: 'orchid', name: 'Orchid Pink', hex: '#C026D3', hoverHex: '#A21CAF', rgb: '192, 38, 211' },
  { id: 'indigo', name: 'Indigo Pro', hex: '#4F46E5', hoverHex: '#4338CA', rgb: '79, 70, 229' },
  { id: 'fpt-orange', name: 'Cam FPT (Mặc định)', hex: '#F26F21', hoverHex: '#EA580C', rgb: '242, 111, 33' },
  { id: 'amber', name: 'Warm Amber', hex: '#F59E0B', hoverHex: '#D97706', rgb: '245, 158, 11' },
  { id: 'ochre', name: 'Golden Ochre', hex: '#D97706', hoverHex: '#B45309', rgb: '217, 119, 6' },
  { id: 'crimson', name: 'Coral Red', hex: '#EF4444', hoverHex: '#DC2626', rgb: '239, 68, 68' },
];

export type AvatarMode = 'initials' | 'preset-1' | 'preset-2' | 'preset-3' | 'preset-4' | 'custom';

export interface AppearanceSettings {
  accentId: string;
  avatarMode: AvatarMode;
  customAvatarUrl?: string;
}

const STORAGE_KEY = 'exe_appearance_settings_v1';

export function loadAppearanceSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
      return {
        accentId: parsed.accentId || 'fpt-orange',
        avatarMode: parsed.avatarMode || 'initials',
        customAvatarUrl: parsed.customAvatarUrl,
      };
    }
  } catch {
    // ignore storage errors
  }
  return {
    accentId: 'fpt-orange',
    avatarMode: 'initials',
  };
}

export function saveAppearanceSettings(settings: AppearanceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function getAccentOption(accentId: string): AccentColorOption {
  return (
    ACCENT_COLOR_OPTIONS.find((c) => c.id === accentId) ||
    ACCENT_COLOR_OPTIONS.find((c) => c.id === 'fpt-orange')!
  );
}

export function applyAccentCssVariables(accentId: string): void {
  const opt = getAccentOption(accentId);
  const root = document.documentElement;
  root.style.setProperty('--accent-color', opt.hex);
  root.style.setProperty('--accent-hover', opt.hoverHex);
  root.style.setProperty('--accent-rgb', opt.rgb);
  root.style.setProperty(
    '--accent-gradient',
    `linear-gradient(135deg, ${opt.hex} 0%, ${opt.hoverHex} 100%)`
  );
  root.style.setProperty('--accent-shadow', `rgba(${opt.rgb}, 0.25)`);
  root.style.setProperty('--accent-ring', `rgba(${opt.rgb}, 0.18)`);
  root.style.setProperty('--accent-soft', `rgba(${opt.rgb}, 0.12)`);
  root.style.setProperty('--primary', opt.hex);
  root.style.setProperty('--primary-hover', opt.hoverHex);
  root.style.setProperty('--primary-light', `rgba(${opt.rgb}, 0.10)`);
  root.style.setProperty('--primary-border', `rgba(${opt.rgb}, 0.28)`);
  root.style.setProperty('--fpt-orange', opt.hex);
  root.style.setProperty('--fpt-orange-hover', opt.hoverHex);
  root.style.setProperty('--fpt-orange-light', `rgba(${opt.rgb}, 0.08)`);
  root.style.setProperty('--pill-active-bg', opt.hex);
  root.style.setProperty('--pill-active-text', '#FFFFFF');
  root.style.setProperty('--pill-active-border', opt.hex);
  root.style.setProperty('--status-progress', opt.hex);
}

/**
 * Renders the 4 Cycle-inspired cute illustrated character avatars or user initials/custom photo
 */
export const UserAvatarBubble: React.FC<{
  settings: AppearanceSettings;
  initials: string;
  size?: number;
  borderRadius?: number | string;
}> = ({ settings, initials, size = 36, borderRadius = '50%' }) => {
  const accent = getAccentOption(settings.accentId);

  if (settings.avatarMode === 'custom' && settings.customAvatarUrl) {
    return (
      <img
        src={settings.customAvatarUrl}
        alt="Avatar"
        style={{
          width: size,
          height: size,
          borderRadius,
          objectFit: 'cover',
          flexShrink: 0,
          border: `2px solid ${accent.hex}`,
        }}
      />
    );
  }

  if (settings.avatarMode === 'preset-1') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#E0E7FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 36 36" fill="none">
          <path d="M9 14C9 9.5 13 6 18 6C23 6 27 9.5 27 14H9Z" fill="#2563EB" />
          <path d="M7 13.5C11 11 21 11 28 13.5" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="14" cy="20" r="3.6" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="22" cy="20" r="3.6" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="14.5" cy="20" r="1.6" fill="#0F172A" />
          <circle cx="22.5" cy="20" r="1.6" fill="#0F172A" />
          <path d="M15.5 26.5C17 28 19 28 20.5 26.5" stroke="#1E293B" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (settings.avatarMode === 'preset-2') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#EDE9FE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 36 36" fill="none">
          <path d="M8 16C8 10 12.5 6 18 6C23.5 6 28 10 28 16" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
          <path d="M10 14C13 9 23 9 26 14" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
          <circle cx="14" cy="20.5" r="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="22" cy="20.5" r="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="14" cy="20.5" r="1.6" fill="#0F172A" />
          <circle cx="22" cy="20.5" r="1.6" fill="#0F172A" />
          <circle cx="11" cy="24" r="1.5" fill="#F472B6" opacity="0.6" />
          <circle cx="25" cy="24" r="1.5" fill="#F472B6" opacity="0.6" />
        </svg>
      </div>
    );
  }

  if (settings.avatarMode === 'preset-3') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#DCFCE7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 36 36" fill="none">
          <path d="M9 15C9 10 13 6.5 18 6.5C23 6.5 27 10 27 15H9Z" fill="#10B981" />
          <circle cx="18" cy="5.5" r="2" fill="#059669" />
          <circle cx="14" cy="20.5" r="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="22" cy="20.5" r="3.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1.5" />
          <circle cx="14.5" cy="20.5" r="1.6" fill="#0F172A" />
          <circle cx="22.5" cy="20.5" r="1.6" fill="#0F172A" />
          <path d="M16 26C17.2 27 18.8 27 20 26" stroke="#065F46" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (settings.avatarMode === 'preset-4') {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#FCE7F3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg width={size * 0.82} height={size * 0.82} viewBox="0 0 36 36" fill="none">
          <path d="M11 11L14 7L18 10L22 7L25 11" stroke="#F43F5E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="9.5" y="16.5" width="7.5" height="6" rx="3" fill="#FFFFFF" stroke="#881337" strokeWidth="1.6" />
          <rect x="19" y="16.5" width="7.5" height="6" rx="3" fill="#FFFFFF" stroke="#881337" strokeWidth="1.6" />
          <line x1="17" y1="19.5" x2="19" y2="19.5" stroke="#881337" strokeWidth="1.6" />
          <circle cx="13.2" cy="19.5" r="1.4" fill="#881337" />
          <circle cx="22.8" cy="19.5" r="1.4" fill="#881337" />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: `linear-gradient(135deg, ${accent.hex} 0%, ${accent.hoverHex} 100%)`,
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: Math.round(size * 0.38),
        flexShrink: 0,
        boxShadow: `0 2px 6px rgba(${accent.rgb}, 0.28)`,
      }}
    >
      {initials}
    </div>
  );
};

interface AppearanceCustomizerModalProps {
  open: boolean;
  onClose: () => void;
  settings: AppearanceSettings;
  onChangeSettings: (next: AppearanceSettings) => void;
  isDarkMode: boolean;
  onSelectTheme: (dark: boolean) => void;
  initials: string;
}

export const AppearanceCustomizerModal: React.FC<AppearanceCustomizerModalProps> = ({
  open,
  onClose,
  settings,
  onChangeSettings,
  isDarkMode,
  onSelectTheme,
  initials,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const currentAccent = getAccentOption(settings.accentId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeSettings({
          ...settings,
          avatarMode: 'custom',
          customAvatarUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cá nhân hóa giao diện"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '1.25rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 24,
          backgroundColor: isDarkMode ? '#151D2F' : '#FFFFFF',
          border: `1px solid ${isDarkMode ? '#223049' : '#E2E8F0'}`,
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          animation: 'cycleModalPop 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN: Controls (Choose color, picture, theme)
           ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: '36px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#151D2F' : '#FFFFFF',
          }}
        >
          <div>
            {/* Brand Mark (Cycle-style clean emblem + title) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '28px' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: `5px solid ${currentAccent.hex}`,
                  boxSizing: 'border-box',
                  transition: 'border-color 150ms ease',
                }}
              />
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#F8FAFC' : '#0F172A',
                }}
              >
                EXE Studio
              </span>
            </div>

            {/* Heading & Subtitle */}
            <h2
              style={{
                fontSize: '23px',
                fontWeight: 800,
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Cá nhân hóa không gian
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: isDarkMode ? '#94A3B8' : '#64748B',
                margin: '0 0 26px 0',
              }}
            >
              Chọn màu chủ đạo, ảnh đại diện và chế độ hiển thị yêu thích của bạn
            </p>

            {/* 1. Choose your color */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E2E8F0' : '#1E293B',
                  marginBottom: '11px',
                }}
              >
                Chọn màu chủ đạo (Accent color)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {ACCENT_COLOR_OPTIONS.map((opt) => {
                  const active = settings.accentId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.name}
                      onClick={() => onChangeSettings({ ...settings, accentId: opt.id })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: opt.hex,
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: active
                          ? `0 0 0 2px ${isDarkMode ? '#151D2F' : '#FFFFFF'}, 0 0 0 4px ${opt.hex}`
                          : 'none',
                        transform: active ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 130ms ease',
                        outline: 'none',
                      }}
                    >
                      {active && <Check size={12} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Choose your picture */}
            <div style={{ marginBottom: '26px' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E2E8F0' : '#1E293B',
                  marginBottom: '11px',
                }}
              >
                Chọn ảnh đại diện (Profile picture)
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Initials Avatar Circle */}
                <button
                  type="button"
                  onClick={() => onChangeSettings({ ...settings, avatarMode: 'initials' })}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    padding: 0,
                    border: 'none',
                    backgroundColor: currentAccent.hex,
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow:
                      settings.avatarMode === 'initials'
                        ? `0 0 0 2px ${isDarkMode ? '#151D2F' : '#FFFFFF'}, 0 0 0 4px ${currentAccent.hex}`
                        : 'none',
                    transition: 'all 140ms ease',
                    outline: 'none',
                  }}
                  title="Chữ cái viết tắt theo màu chủ đạo"
                >
                  {initials}
                </button>

                {/* Upload Image Button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    height: 34,
                    padding: '0 13px',
                    borderRadius: 9,
                    backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                    border: `1px solid ${
                      settings.avatarMode === 'custom'
                        ? currentAccent.hex
                        : isDarkMode
                        ? '#334155'
                        : '#E2E8F0'
                    }`,
                    color: isDarkMode ? '#E2E8F0' : '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                    outline: 'none',
                  }}
                >
                  Tải ảnh lên
                </button>

                {/* 4 Cute Illustrated Character Presets */}
                {(['preset-1', 'preset-2', 'preset-3', 'preset-4'] as AvatarMode[]).map((preset) => {
                  const selected = settings.avatarMode === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChangeSettings({ ...settings, avatarMode: preset })}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        boxShadow: selected
                          ? `0 0 0 2px ${isDarkMode ? '#151D2F' : '#FFFFFF'}, 0 0 0 4px ${currentAccent.hex}`
                          : 'none',
                        transition: 'all 140ms ease',
                        outline: 'none',
                      }}
                      title="Avatar nhân vật"
                    >
                      <UserAvatarBubble
                        settings={{ ...settings, avatarMode: preset }}
                        initials={initials}
                        size={36}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Choose your theme (Light / Dark visual cards) */}
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E2E8F0' : '#1E293B',
                  marginBottom: '11px',
                }}
              >
                Chọn chế độ nền (Theme)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: 340 }}>
                {/* Light Card */}
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectTheme(false)}
                    style={{
                      width: '100%',
                      height: 88,
                      borderRadius: 12,
                      padding: '10px 0 0 12px',
                      backgroundColor: '#F1F5F9',
                      border: !isDarkMode
                        ? `2px solid ${currentAccent.hex}`
                        : `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                      boxShadow: !isDarkMode ? `0 0 0 3px rgba(${currentAccent.rgb}, 0.15)` : 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      display: 'flex',
                      outline: 'none',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderTopLeftRadius: 8,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        overflow: 'hidden',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                      }}
                    >
                      <div style={{ width: 34, backgroundColor: '#FFFFFF', borderRight: '1px solid #F1F5F9' }} />
                      <div style={{ flex: 1, backgroundColor: '#F8FAFC' }} />
                    </div>
                  </button>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: !isDarkMode ? 700 : 500,
                      color: isDarkMode ? '#94A3B8' : '#334155',
                      marginTop: '6px',
                    }}
                  >
                    Sáng (Light)
                  </div>
                </div>

                {/* Dark Card */}
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectTheme(true)}
                    style={{
                      width: '100%',
                      height: 88,
                      borderRadius: 12,
                      padding: '10px 0 0 12px',
                      backgroundColor: '#334155',
                      border: isDarkMode
                        ? `2px solid ${currentAccent.hex}`
                        : `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                      boxShadow: isDarkMode ? `0 0 0 3px rgba(${currentAccent.rgb}, 0.18)` : 'none',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      display: 'flex',
                      outline: 'none',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderTopLeftRadius: 8,
                        backgroundColor: '#0F172A',
                        display: 'flex',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ width: 34, backgroundColor: '#0B1120', borderRight: '1px solid #1E293B' }} />
                      <div style={{ flex: 1, backgroundColor: '#151D2F' }} />
                    </div>
                  </button>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: isDarkMode ? 700 : 500,
                      color: isDarkMode ? '#E2E8F0' : '#64748B',
                      marginTop: '6px',
                    }}
                  >
                    Tối (Dark)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 22px',
                borderRadius: 9,
                background: `linear-gradient(135deg, ${currentAccent.hex} 0%, ${currentAccent.hoverHex} 100%)`,
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 4px 12px rgba(${currentAccent.rgb}, 0.3)`,
                transition: 'all 150ms ease',
                outline: 'none',
              }}
            >
              Hoàn tất
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: Live Interactive Mini-App Preview (Cycle Style)
           ══════════════════════════════════════════════════════════════ */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#0B1120' : '#F4F6FA',
            padding: '28px 0 0 34px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: `1px solid ${isDarkMode ? '#1E293B' : '#F1F5F9'}`,
          }}
        >
          {/* Top-right Close / Progress Ring */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '24px', marginBottom: '18px' }}>
            <button
              type="button"
              onClick={onClose}
              title="Đóng"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                border: `1px solid ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                color: isDarkMode ? '#94A3B8' : '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Cropped Floating App Window Preview */}
          <div
            style={{
              flex: 1,
              borderTopLeftRadius: 20,
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
              borderTop: `1px solid ${isDarkMode ? '#1E293B' : '#E2E8F0'}`,
              borderLeft: `1px solid ${isDarkMode ? '#1E293B' : '#E2E8F0'}`,
              boxShadow: '-12px 12px 36px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {/* Mini Sidebar */}
            <div
              style={{
                width: 170,
                padding: '20px 16px',
                borderRight: `1px solid ${isDarkMode ? '#1E293B' : '#F1F5F9'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '22px',
                flexShrink: 0,
              }}
            >
              {/* Mini Sidebar Header: Logo Box + Live User Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: isDarkMode ? '#1E293B' : '#CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: `2.5px solid ${ isDarkMode ? '#94A3B8' : '#FFFFFF' }`,
                    }}
                  />
                </div>

                {/* Live Avatar Preview */}
                <UserAvatarBubble settings={settings} initials={initials} size={24} />
              </div>

              {/* Primary Navigation Skeleton Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                {[
                  { width: 64, active: false },
                  { width: 48, active: false },
                  { width: 58, active: false },
                  { width: 66, active: true },
                ].map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        backgroundColor: row.active
                          ? `rgba(${currentAccent.rgb}, 0.18)`
                          : isDarkMode
                          ? '#1E293B'
                          : '#F1F5F9',
                        color: row.active ? currentAccent.hex : '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {row.active ? '+' : '•'}
                    </div>
                    <div
                      style={{
                        width: row.width,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: row.active
                          ? `rgba(${currentAccent.rgb}, 0.32)`
                          : isDarkMode
                          ? '#1E293B'
                          : '#E2E8F0',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Workspace / Course Items with Mini Color Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                {[
                  { color: '#3B82F6', width: 62 },
                  { color: '#F59E0B', width: 38 },
                  { color: '#EC4899', width: 56 },
                  { color: '#EAB308', width: 74 },
                  { color: '#06B6D4', width: 52 },
                  { color: '#EF4444', width: 44 },
                  { color: currentAccent.hex, width: 60 },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        backgroundColor: item.color,
                        opacity: 0.85,
                      }}
                    />
                    <div
                      style={{
                        width: item.width,
                        height: 6,
                        borderRadius: 999,
                        backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mini Content Canvas */}
            <div
              style={{
                flex: 1,
                backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Top Skeleton Bar */}
              <div
                style={{
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: isDarkMode ? '#1E293B' : '#EEF2F6',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    width: 70,
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: isDarkMode ? '#334155' : '#CBD5E1',
                  }}
                />
                <div
                  style={{
                    width: 38,
                    height: 14,
                    borderRadius: 999,
                    backgroundColor: currentAccent.hex,
                    opacity: 0.9,
                  }}
                />
              </div>

              {/* 3 Content Cards */}
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  style={{
                    height: 92,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? '#151D2F' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#1E293B' : '#F1F5F9'}`,
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                      style={{
                        width: 90,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
                      }}
                    />
                    {card === 1 && (
                      <div
                        style={{
                          width: 24,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: `rgba(${currentAccent.rgb}, 0.25)`,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      width: '75%',
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cycleModalPop {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};
