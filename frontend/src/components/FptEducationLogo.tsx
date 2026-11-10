import React from 'react';

interface FptEducationLogoProps {
  compact?: boolean;
  scale?: number;
}

export const FptEducationLogo: React.FC<FptEducationLogoProps> = ({ compact = false, scale = 1 }) => {
  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px',
          userSelect: 'none',
        }}
        title="Trường Đại học FPT"
      >
        <div
          style={{
            width: 15,
            height: 24,
            borderRadius: 4,
            background: '#0054a6',
            color: '#ffffff',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '11px',
            fontFamily: '"Arial Black", "Arial", sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'skewX(-15deg)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          <span style={{ transform: 'skewX(15deg)' }}>F</span>
        </div>
        <div
          style={{
            width: 15,
            height: 28,
            borderRadius: 4,
            background: '#f26f21',
            color: '#ffffff',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '11px',
            fontFamily: '"Arial Black", "Arial", sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'skewX(-15deg) translateY(-2px)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          <span style={{ transform: 'skewX(15deg)' }}>P</span>
        </div>
        <div
          style={{
            width: 15,
            height: 24,
            borderRadius: 4,
            background: '#008837',
            color: '#ffffff',
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: '11px',
            fontFamily: '"Arial Black", "Arial", sans-serif',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'skewX(-15deg)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
          }}
        >
          <span style={{ transform: 'skewX(15deg)' }}>T</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'left center',
      }}
    >
      {/* Single clean row: [F] [P] [T] emblem + Education */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {/* F Leaf */}
          <div
            style={{
              width: 19,
              height: 26,
              borderRadius: 4,
              background: '#0054a6',
              color: '#ffffff',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: '13px',
              fontFamily: '"Arial Black", "Arial", sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'skewX(-15deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ transform: 'skewX(15deg)' }}>F</span>
          </div>

          {/* P Leaf (higher & taller) */}
          <div
            style={{
              width: 19,
              height: 31,
              borderRadius: 4,
              background: '#f26f21',
              color: '#ffffff',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: '13px',
              fontFamily: '"Arial Black", "Arial", sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'skewX(-15deg) translateY(-2px)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ transform: 'skewX(15deg)' }}>P</span>
          </div>

          {/* T Leaf */}
          <div
            style={{
              width: 19,
              height: 26,
              borderRadius: 4,
              background: '#008837',
              color: '#ffffff',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: '13px',
              fontFamily: '"Arial Black", "Arial", sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'skewX(-15deg)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <span style={{ transform: 'skewX(15deg)' }}>T</span>
          </div>
        </div>

        {/* Education Text + Registered mark */}
        <div style={{ display: 'inline-flex', alignItems: 'flex-start', marginLeft: '2px' }}>
          <span
            style={{
              color: '#0072bc',
              fontWeight: 700,
              fontSize: '1.1rem',
              letterSpacing: '-0.01em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              lineHeight: 1,
            }}
          >
            Education
          </span>
          <span
            style={{
              color: '#0072bc',
              fontSize: '0.55rem',
              fontWeight: 700,
              marginLeft: '2px',
              marginTop: '-2px',
            }}
          >
            ®
          </span>
        </div>
      </div>
    </div>
  );
};
