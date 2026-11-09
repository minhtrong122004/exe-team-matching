import React, { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

export interface CampusItem {
  id: string;
  name: string;
  image: string;
  pinX: string;
  pinY: string;
  cardPos: { top: string; left: string };
  recruitingCount: number;
  tags: string[];
  lat: number;
  lon: number;
}

export const FPT_CAMPUSES: CampusItem[] = [
  {
    id: 'HCM',
    name: 'Campus Hồ Chí Minh',
    image: '/campuses/hcm.jpg',
    pinX: '58%',
    pinY: '56%',
    cardPos: { top: '44%', left: '22%' },
    recruitingCount: 18,
    tags: ['+1 MKT', '+1 SE', '+1 GD'],
    lat: 10.8231,
    lon: 106.6297,
  },
  {
    id: 'HN',
    name: 'Campus Hà Nội',
    image: '/campuses/hn.jpg',
    pinX: '54%',
    pinY: '32%',
    cardPos: { top: '24%', left: '36%' },
    recruitingCount: 24,
    tags: ['+1 AI', '+1 IB', '+1 SE'],
    lat: 21.0285,
    lon: 105.8542,
  },
  {
    id: 'DN',
    name: 'Campus Đà Nẵng',
    image: '/campuses/dn.jpg',
    pinX: '62%',
    pinY: '44%',
    cardPos: { top: '34%', left: '42%' },
    recruitingCount: 12,
    tags: ['+1 GD', '+1 MKT', '+1 SE'],
    lat: 16.0544,
    lon: 108.2022,
  },
  {
    id: 'CT',
    name: 'Campus Cần Thơ',
    image: '/campuses/ct.jpg',
    pinX: '52%',
    pinY: '64%',
    cardPos: { top: '52%', left: '38%' },
    recruitingCount: 9,
    tags: ['+1 SE', '+1 IB'],
    lat: 10.0452,
    lon: 105.7469,
  },
  {
    id: 'QN',
    name: 'Campus Quy Nhơn',
    image: '/campuses/qn.jpg',
    pinX: '66%',
    pinY: '50%',
    cardPos: { top: '38%', left: '46%' },
    recruitingCount: 7,
    tags: ['+1 AI', '+1 SE'],
    lat: 13.7830,
    lon: 109.2197,
  },
];

export const ExeNetworkGlobe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<any>(null);
  const [activeCampusIndex, setActiveCampusIndex] = useState<number>(0);
  const isInteractingRef = useRef<boolean>(false);
  const phiRef = useRef<number>(1.95); // Vietnam longitude ~108°E
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef<number>(0);

  const activeCampus = FPT_CAMPUSES[activeCampusIndex];

  // Auto-cycle through campuses every 4 seconds unless user clicked recently
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isInteractingRef.current) {
        setActiveCampusIndex((prev) => (prev + 1) % FPT_CAMPUSES.length);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // WebGL 3D Globe with Continent Dots via Cobe (Mount once & Continuous 60fps Rotation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    try {
      const globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: 380 * 2,
        height: 380 * 2,
        phi: phiRef.current,
        theta: 0.28,
        dark: 0,
        diffuse: 1.15,
        mapSamples: 22000, // High density continent landmass dots
        mapBrightness: 6,
        baseColor: [0.82, 0.86, 0.92], // Slate continent dots
        markerColor: [0.95, 0.44, 0.14], // FPT Orange #F27024
        glowColor: [0.92, 0.95, 0.98], // Subtle ambient glow
        markers: FPT_CAMPUSES.map((c, i) => ({
          location: [c.lat, c.lon],
          size: i === 0 ? 0.09 : 0.045,
        })),
      });

      globeRef.current = globe;

      // ── Continuous 60fps Rotation Animation Loop ──
      const animate = () => {
        if (!pointerInteracting.current) {
          phiRef.current += 0.003; // Smooth continuous rotation
        }
        globe.update({ phi: phiRef.current });
        animId = requestAnimationFrame(animate);
      };

      animId = requestAnimationFrame(animate);
    } catch {
      // Fallback if WebGL unavailable in current environment: 2D canvas rendering
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      if (globeRef.current) {
        globeRef.current.destroy();
        globeRef.current = null;
      }
    };
  }, []);

  // Sync active marker size when activeCampusIndex changes without rebuilding the WebGL context
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.update({
        markers: FPT_CAMPUSES.map((c, i) => ({
          location: [c.lat, c.lon],
          size: i === activeCampusIndex ? 0.09 : 0.045,
        })),
      });
    }
  }, [activeCampusIndex]);

  const handleSelectCampus = (idx: number) => {
    setActiveCampusIndex(idx);
    isInteractingRef.current = true;
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 7000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', userSelect: 'none' }}>
      {/* ── GLOBE & ORBIT STAGE (380x380 px) ── */}
      <div
        className="globe-container"
        style={{
          position: 'relative',
          width: '380px',
          height: '380px',
          margin: '8px auto 16px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
        }}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            phiRef.current += delta * 0.001;
            if (globeRef.current) {
              globeRef.current.update({ phi: phiRef.current });
            }
          }
        }}
      >
        {/* Layer 1: 3D Sphere Base with ambient lighting */}
        <div
          style={{
            position: 'absolute',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFFFFF 0%, #F1F5F9 60%, #E2E8F0 100%)',
            boxShadow:
              'inset -18px -18px 40px rgba(15, 23, 42, 0.08), inset 12px 12px 25px rgba(255, 255, 255, 0.95), 0 20px 45px -10px rgba(15, 23, 42, 0.08)',
            border: '1px solid #E2E8F0',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 2: 3D Dotted Globe (Cobe WebGL Canvas - Continuous 60fps Rotation) */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 3: SVG Satellite Orbits & Connecting Lines */}
        <svg
          viewBox="0 0 380 380"
          style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          {/* Orbit 1: Dashed orange curve */}
          <g transform="translate(190, 190) rotate(-22) translate(-190, -190)">
            <ellipse
              cx="190"
              cy="190"
              rx="170"
              ry="60"
              fill="none"
              stroke="#F27024"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
            <circle cx="345" cy="195" r="3.5" fill="#F27024" />
          </g>

          {/* Orbit 2: Dashed orange curve */}
          <g transform="translate(190, 190) rotate(25) translate(-190, -190)">
            <ellipse
              cx="190"
              cy="190"
              rx="174"
              ry="66"
              fill="none"
              stroke="#F27024"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
            <circle cx="35" cy="190" r="3" fill="#F27024" />
          </g>

          {/* Orbit 3: Dashed orange curve */}
          <g transform="translate(190, 190) rotate(-65) translate(-190, -190)">
            <ellipse
              cx="190"
              cy="190"
              rx="168"
              ry="54"
              fill="none"
              stroke="#F27024"
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
            <circle cx="280" cy="155" r="3" fill="#F27024" />
          </g>
        </svg>

        {/* Layer 4: Campus Geographic Pins on the Globe */}
        {FPT_CAMPUSES.map((campus, idx) => {
          const isActive = idx === activeCampusIndex;
          return (
            <div
              key={campus.id}
              onClick={() => handleSelectCampus(idx)}
              style={{
                position: 'absolute',
                left: campus.pinX,
                top: campus.pinY,
                transform: 'translate(-50%, -50%)',
                zIndex: isActive ? 20 : 15,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              title={`Chọn ${campus.name}`}
            >
              {/* Active Radar Ripple Beacon */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(242, 112, 36, 0.35)',
                    animation: 'ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Pin Core Dot */}
              <div
                style={{
                  width: isActive ? '14px' : '9px',
                  height: isActive ? '14px' : '9px',
                  borderRadius: '50%',
                  backgroundColor: '#F27024',
                  border: isActive ? '2px solid #FFFFFF' : '1.5px solid #FFFFFF',
                  boxShadow: isActive
                    ? '0 0 14px rgba(242, 112, 36, 0.9), 0 2px 6px rgba(0,0,0,0.25)'
                    : '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.25s ease',
                }}
              />

              {/* Pin Label Tooltip */}
              <span
                style={{
                  marginTop: '3px',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: isActive ? '#0F172A' : '#64748B',
                  backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: `1px solid ${isActive ? '#F27024' : '#E2E8F0'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {campus.id}
              </span>
            </div>
          );
        })}

        {/* Layer 5: Floating Campus Node Card with REAL IMAGE */}
        <div
          style={{
            position: 'absolute',
            top: activeCampus.cardPos.top,
            left: activeCampus.cardPos.left,
            width: '210px',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '8px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 36px -6px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9)',
            zIndex: 30,
            transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1), left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
          }}
        >
          {/* Real Campus Image */}
          <div
            style={{
              position: 'relative',
              height: '84px',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '6px',
              backgroundColor: '#F1F5F9',
            }}
          >
            <img
              src={activeCampus.image}
              alt={activeCampus.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          {/* Campus Dot + Name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '2px 4px 4px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#F27024',
                flexShrink: 0,
                boxShadow: '0 0 6px rgba(242, 112, 36, 0.7)',
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                lineHeight: 1.3,
              }}
            >
              {activeCampus.name}
            </span>
          </div>
        </div>
      </div>

      {/* ── CAMPUS SELECTOR PILLS ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginRight: '4px' }}>
          Chọn Cơ Sở:
        </span>
        {FPT_CAMPUSES.map((c, idx) => {
          const isActive = idx === activeCampusIndex;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCampus(idx)}
              style={{
                backgroundColor: isActive ? '#0F172A' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                border: `1px solid ${isActive ? '#0F172A' : '#E2E8F0'}`,
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(15,23,42,0.15)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#F27024';
                  e.currentTarget.style.color = '#F27024';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.color = '#475569';
                }
              }}
            >
              {c.id}
            </button>
          );
        })}
      </div>
    </div>
  );
};
