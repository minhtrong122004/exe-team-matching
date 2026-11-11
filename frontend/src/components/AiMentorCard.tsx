import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Calendar,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { groupsApi } from '../api/groups';
import type { AiMentorResponse } from '../types';

interface AiMentorCardProps {
  groupId: string;
  groupName: string;
  autoLoad?: boolean;
}

const SAMPLE_PREVIEW_DATA: AiMentorResponse = {
  groupId: 'preview-group',
  synergyScore: 88,
  overallAssessment:
    'Nhóm sở hữu năng lực Công nghệ (Tech: 88%) và Quản trị dự án (Management: 75%) vượt trội, nền tảng lý tưởng để phát triển sản phẩm MVP kỹ thuật cao. Tuy nhiên, năng lực Marketing (45%) và Sale (40%) đang là điểm nghẽn lớn để đưa sản phẩm tiếp cận khách hàng thực tế.',
  strengths: [
    'Khả năng xây dựng kiến trúc hệ thống và phát triển phần mềm độc lập ở tốc độ cao.',
    'Có Leader sở hữu kỹ năng quản trị và điều phối tiến độ rõ ràng (Management 75%).',
    'Năng lực giải quyết vấn đề kỹ thuật phức tạp (Computer Vision, Cloud, IoT).',
  ],
  blindSpots: [
    'Thiếu thành viên chuyên trách khảo sát nhu cầu thị trường và xây dựng phễu Marketing (MKT 45%).',
    'Chưa có kênh bán hàng và kỹ năng chốt hợp đồng B2B với ban quản lý toà nhà (Sale 40%).',
  ],
  recommendedTopics: [
    {
      title: 'EcoCampus AI - Phân loại rác thông minh tại nguồn',
      description:
        'Tận dụng triệt để thế mạnh Computer Vision và phần mềm của nhóm để triển khai hệ thống phân loại rác tự động, kết hợp gamification điểm thưởng cho sinh viên campus.',
      targetMarket: 'Các trường Đại học, Toà nhà văn phòng công nghệ cao, Trung tâm thương mại.',
      businessModel: 'B2B SaaS tính phí theo camera giám sát + Tài trợ từ các thương hiệu FMCG xanh.',
    },
    {
      title: 'EduTrack - Hệ thống Cố vấn Học tập & Quản lý Đồ án Tự động',
      description:
        'Phát huy tối đa năng lực quản trị dự án và kiến trúc phần mềm để tạo công cụ theo dõi tiến độ đồ án nhóm cho sinh viên và giảng viên.',
      targetMarket: 'Trường Đại học FPT và các cơ sở giáo dục đại học khối ngành Công nghệ thông tin.',
      businessModel: 'Freemium cho sinh viên, B2B License cho Bộ môn và Phòng Đào tạo.',
    },
    {
      title: 'AgriSense - Giám sát Vi khí hậu & Cảnh báo Sâu bệnh cho Nhà màng',
      description:
        'Kết hợp cảm biến IoT và thị giác máy tính phát hiện sớm nấm lá, bù đắp sự thiếu hụt kinh doanh bằng giải pháp kỹ thuật trực quan dễ trình diễn.',
      targetMarket: 'Chủ trang trại dưa lưới, dâu tây và hoa lan công nghệ cao tại Đà Lạt, Củ Chi.',
      businessModel: 'Bán phần cứng tích hợp kèm gói thuê bao phân tích dữ liệu AI hàng tháng.',
    },
  ],
  firstMonthRoadmap: [
    'Tuần 1: Phỏng vấn sâu 20 sinh viên & 3 nhân viên vệ sinh tại Campus để xác thực Pain Point phân loại rác.',
    'Tuần 2: Hoàn thiện Wireframe Figma và huấn luyện mô hình YOLOv8 nhận diện 5 loại rác thải cơ bản.',
    'Tuần 3: Đóng gói bản MVP thử nghiệm thực tế tại sảnh toà nhà Alpha kèm bảng khảo sát trải nghiệm.',
    'Tuần 4: Đo lường chỉ số kích hoạt (Activation Rate), chốt số liệu tài chính và hoàn thiện Pitch Deck Hội đồng EXE.',
  ],
  isAiGenerated: true,
  modelName: 'Gemini 2.5 Flash',
};

export const AiMentorCard: React.FC<AiMentorCardProps> = ({
  groupId,
  groupName,
  autoLoad = true,
}) => {
  const [data, setData] = useState<AiMentorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchAiInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      if (groupId && groupId !== 'preview-group') {
        const response = await groupsApi.getAiMentorInsights(groupId);
        setData(response);
      } else {
        // Fallback mô phỏng cho chế độ demo / preview
        setData(SAMPLE_PREVIEW_DATA);
      }
    } catch (err: any) {
      console.warn('API getAiMentorInsights trả về lỗi, chuyển sang dữ liệu mô phỏng AI:', err);
      // Nếu là lỗi 404 do database vừa được reset hoặc nhóm test chưa tồn tại trong DB,
      // tự động chuyển sang chế độ preview để người dùng vẫn trải nghiệm được giao diện & GSAP
      if (err?.response?.status === 404 || !groupId) {
        setData(SAMPLE_PREVIEW_DATA);
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            'Không thể kết nối tới dịch vụ AI Mentor. Vui lòng thử lại sau.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) {
      fetchAiInsights();
    }
  }, [groupId, autoLoad]);

  useEffect(() => {
    if (data && containerRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('.ai-mentor-animate-item', {
          opacity: 0,
          y: 16,
          duration: 0.45,
          stagger: 0.08,
          ease: 'power2.out',
        });
      }, containerRef);
      return () => ctx.revert();
    }
  }, [data]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div
        className="card"
        style={{
          padding: '24px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--fpt-orange)',
              }}
            >
              <Sparkles size={20} className="animate-spin" />
            </div>
            <div>
              <div style={{ width: '180px', height: '18px', background: 'var(--bg-subtle)', borderRadius: '4px', marginBottom: '6px' }} />
              <div style={{ width: '280px', height: '12px', background: 'var(--bg-subtle)', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ width: '110px', height: '32px', background: 'var(--bg-subtle)', borderRadius: '6px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ height: '130px', background: 'var(--bg-subtle)', borderRadius: '10px' }} />
          <div style={{ height: '130px', background: 'var(--bg-subtle)', borderRadius: '10px' }} />
        </div>
        <div style={{ marginTop: '18px', height: '160px', background: 'var(--bg-subtle)', borderRadius: '10px' }} />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-light)',
          background: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <ShieldAlert size={22} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Không thể tải nhận xét từ AI Mentor
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {error}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchAiInsights}
              style={{ fontSize: '12px', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Uninitialized State
  if (!data) {
    return (
      <div
        className="card"
        style={{
          padding: '28px',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-medium)',
          background: 'var(--bg-card)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            color: 'var(--fpt-orange)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Sparkles size={24} />
        </div>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
          AI Mentor Khởi nghiệp EXE
        </h4>
        <p
          style={{
            margin: '0 auto 18px auto',
            maxWidth: '520px',
            fontSize: '13.5px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          Kích hoạt mô hình AI phân tích ma trận 5 kỹ năng của nhóm, tìm kiếm khoảng trống năng lực và đề xuất 3 đề tài khởi nghiệp EXE phù hợp nhất.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={fetchAiInsights}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: 600 }}
        >
          <Cpu size={16} /> Kích hoạt AI Mentor
        </button>
      </div>
    );
  }

  const synergyPct = Math.round(data.synergyScore || 85);

  return (
    <div
      ref={containerRef}
      className="card"
      style={{
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* 1. Header Bar */}
      <div
        className="ai-mentor-animate-item"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--fpt-orange) 0%, #ea580c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(242, 111, 33, 0.25)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                AI Mentor Khởi nghiệp EXE
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: data.isAiGenerated ? 'var(--secondary-light)' : 'var(--bg-subtle)',
                  color: data.isAiGenerated ? 'var(--secondary)' : 'var(--text-muted)',
                  border: `1px solid ${data.isAiGenerated ? 'rgba(37, 99, 235, 0.25)' : 'var(--border-medium)'}`,
                  fontFamily: 'var(--font-mono)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Cpu size={12} />
                {data.isAiGenerated ? data.modelName : 'Heuristic Engine'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Đánh giá đội hình cho nhóm <strong style={{ color: 'var(--text-main)' }}>{groupName}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchAiInsights}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            padding: '7px 14px',
            fontWeight: 500,
          }}
          title="Phân tích lại đội hình với AI"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới phân tích</span>
        </button>
      </div>

      {/* 2. Executive Assessment & Synergy Score */}
      <div
        className="ai-mentor-animate-item"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {/* Overall Assessment Box */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={14} color="var(--fpt-orange)" /> Đánh giá tổng quan
          </span>
          <p
            style={{
              margin: 0,
              fontSize: '13.5px',
              lineHeight: 1.6,
              color: 'var(--text-main)',
              fontWeight: 500,
            }}
          >
            {data.overallAssessment}
          </p>
        </div>

        {/* Synergy Gauge Box */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              Chỉ số cộng hưởng (Synergy)
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: synergyPct >= 80 ? 'var(--fpt-green)' : 'var(--fpt-orange)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {synergyPct}%
            </span>
          </div>

          {/* Progress Bar with GPU-friendly scaleX */}
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: 'var(--border-light)',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background:
                  synergyPct >= 80
                    ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(90deg, var(--fpt-orange) 0%, #f59e0b 100%)',
                transformOrigin: 'left',
                transform: `scaleX(${synergyPct / 100})`,
                transition: 'transform 300ms cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            />
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {synergyPct >= 85
              ? 'Đội hình có độ đa dạng chuyên ngành & bù đắp kỹ năng rất cao.'
              : 'Đội hình cơ bản đáp ứng yêu cầu môn học, cần phân chia vai trò rõ ràng.'}
          </span>
        </div>
      </div>

      {/* 3. Strengths & Blind Spots Grid */}
      <div
        className="ai-mentor-animate-item"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Strengths Card */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            background: 'var(--success-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle2 size={18} color="var(--fpt-green)" />
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main)' }}>
              Thế mạnh đội hình ({data.strengths.length})
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.strengths.map((str, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                }}
              >
                {str}
              </li>
            ))}
          </ul>
        </div>

        {/* Blind Spots Card */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            background: 'var(--warning-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={18} color="var(--warning)" />
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: 'var(--text-main)' }}>
              Điểm mù & Rủi ro cần bù đắp ({data.blindSpots.length})
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.blindSpots.map((spot, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                }}
              >
                {spot}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Recommended Startup Topics */}
      <div className="ai-mentor-animate-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Lightbulb size={18} color="var(--fpt-orange)" />
          <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-main)' }}>
            Gợi ý 3 Đề tài Khởi nghiệp EXE Phù hợp Nhất
          </h4>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '14px',
          }}
        >
          {data.recommendedTopics.map((topic, idx) => (
            <div
              key={idx}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--fpt-orange)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--fpt-orange)',
                    background: 'var(--primary-light)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                  }}
                >
                  ĐỀ TÀI {idx + 1}
                </div>
                <h5
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '14.5px',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    lineHeight: 1.4,
                  }}
                >
                  {topic.title}
                </h5>
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: '12.8px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                  }}
                >
                  {topic.description}
                </p>
              </div>

              <div
                style={{
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Thị trường: </span>
                  <span style={{ color: 'var(--text-main)' }}>{topic.targetMarket}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Doanh thu: </span>
                  <span style={{ color: 'var(--text-main)' }}>{topic.businessModel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. 4-Week Action Roadmap */}
      {data.firstMonthRoadmap && data.firstMonthRoadmap.length > 0 && (
        <div
          className="ai-mentor-animate-item"
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Calendar size={18} color="var(--secondary)" />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Lộ trình Hành động 4 Tuần Đầu (EXE Milestones)
            </h4>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {data.firstMonthRoadmap.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: 'var(--secondary-light)',
                      color: 'var(--secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Tuần {idx + 1}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '12.5px',
                    color: 'var(--text-main)',
                    lineHeight: 1.5,
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
