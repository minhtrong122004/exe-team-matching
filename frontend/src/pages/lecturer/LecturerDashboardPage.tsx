import React, { useState } from 'react';
import {
  Download,
  Users,
  CheckCircle2,
  Search,
  Eye,
  X,
  Sparkles,
  TrendingUp,
  Layers,
} from '../../utils/icons';

interface GroupMember {
  studentCode: string;
  fullName: string;
  email: string;
  major: string;
  classCode: string;
  role: 'Leader' | 'Member';
  skills: {
    tech: number;
    management: number;
    graphicDesign: number;
    marketing: number;
    sale: number;
  };
}

interface LecturerGroup {
  id: string;
  code: string;
  topic: string;
  topicDesc: string;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
  majorsSummary: string;
  balanceScore: number;
  status: 'Locked' | 'Closed';
  members: GroupMember[];
}

const LECTURER_GROUPS: LecturerGroup[] = [
  {
    id: 'lg-01',
    code: 'FA26EXE101-01',
    topic: 'SmartAgri - Giám sát nông nghiệp chính xác bằng IoT và AI',
    topicDesc: 'Hệ thống cảm biến và camera giám sát độ ẩm, sâu bệnh thời gian thực cho nhà màng dưa lưới công nghệ cao.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Trần Cẩm Tú',
    majorsSummary: 'GD (1), SE (2), MKT (1), IB (1)',
    balanceScore: 91,
    status: 'Locked',
    members: [
      { studentCode: 'GD181402', fullName: 'Trần Cẩm Tú', email: 'tutcgd181402@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1801', role: 'Leader', skills: { tech: 40, management: 85, graphicDesign: 90, marketing: 60, sale: 65 } },
      { studentCode: 'SE181288', fullName: 'Trịnh Thế Bảo', email: 'baottse181288@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1803', role: 'Member', skills: { tech: 90, management: 60, graphicDesign: 30, marketing: 40, sale: 40 } },
      { studentCode: 'SE181511', fullName: 'Phạm Hoàng Khang', email: 'khangphse181511@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1802', role: 'Member', skills: { tech: 85, management: 55, graphicDesign: 40, marketing: 35, sale: 45 } },
      { studentCode: 'MKT180120', fullName: 'Võ Trọng Tín', email: 'tinvtmkt180120@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1801', role: 'Member', skills: { tech: 35, management: 65, graphicDesign: 60, marketing: 95, sale: 80 } },
      { studentCode: 'IB181399', fullName: 'Nguyễn Kiều Oanh', email: 'oanhnkib181399@fpt.edu.vn', major: 'Quản trị kinh doanh (BA)', classCode: 'IB1801', role: 'Member', skills: { tech: 30, management: 80, graphicDesign: 40, marketing: 70, sale: 90 } },
    ],
  },
  {
    id: 'lg-02',
    code: 'FA26EXE101-02',
    topic: 'MediQuick - Nền tảng kết nối dược sĩ tư vấn và giao thuốc 2h',
    topicDesc: 'Ứng dụng tìm kiếm nhà thuốc GPP gần nhất, đặt đơn theo toa có tư vấn video call với dược sĩ chuyên môn.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Trần Minh Quân',
    majorsSummary: 'SE (2), GD (2), MKT (1)',
    balanceScore: 92,
    status: 'Locked',
    members: [
      { studentCode: 'SE185108', fullName: 'Trần Minh Quân', email: 'quantmse185108@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1801', role: 'Leader', skills: { tech: 90, management: 82, graphicDesign: 40, marketing: 60, sale: 70 } },
      { studentCode: 'GD180215', fullName: 'Lê Hoàng Yến', email: 'yenlhgd180215@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', classCode: 'GD1802', role: 'Member', skills: { tech: 40, management: 50, graphicDesign: 95, marketing: 60, sale: 45 } },
      { studentCode: 'SE185102', fullName: 'Lữ Phước Nhật Tú', email: 'tulpnse185102@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1801', role: 'Member', skills: { tech: 88, management: 70, graphicDesign: 50, marketing: 65, sale: 60 } },
      { studentCode: 'GD180332', fullName: 'Lê Hồng Phong', email: 'phonglhgd180332@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1801', role: 'Member', skills: { tech: 45, management: 55, graphicDesign: 92, marketing: 60, sale: 40 } },
      { studentCode: 'MKT180411', fullName: 'Phạm Thu Hà', email: 'haptmkt180411@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1802', role: 'Member', skills: { tech: 30, management: 65, graphicDesign: 55, marketing: 90, sale: 85 } },
    ],
  },
  {
    id: 'lg-03',
    code: 'FA26EXE101-03',
    topic: 'EcoCampus - Hệ thống Phân loại Rác Thông minh AI',
    topicDesc: 'Ứng dụng Computer Vision tự động phân loại rác thải tại nguồn cho các khu campus đại học và tòa nhà thông minh.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Nguyễn Đức Anh',
    majorsSummary: 'SE (2), AI (1), MKT (1), GD (1)',
    balanceScore: 94,
    status: 'Locked',
    members: [
      { studentCode: 'SE180201', fullName: 'Nguyễn Đức Anh', email: 'anhndse180201@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1802', role: 'Leader', skills: { tech: 92, management: 80, graphicDesign: 45, marketing: 50, sale: 55 } },
      { studentCode: 'SE180145', fullName: 'Phạm Bảo Trân', email: 'tranpbse180145@fpt.edu.vn', major: 'Trí tuệ nhân tạo (AI)', classCode: 'SE1801', role: 'Member', skills: { tech: 95, management: 60, graphicDesign: 35, marketing: 40, sale: 40 } },
      { studentCode: 'SE180302', fullName: 'Trần Quang Huy', email: 'huytqse180302@fpt.edu.vn', major: 'Trí tuệ nhân tạo (AI)', classCode: 'SE1801', role: 'Member', skills: { tech: 90, management: 65, graphicDesign: 40, marketing: 50, sale: 45 } },
      { studentCode: 'MKT180801', fullName: 'Đặng Mai Linh', email: 'linhdmmkt180801@fpt.edu.vn', major: 'Truyền thông đa phương tiện', classCode: 'MKT1801', role: 'Member', skills: { tech: 40, management: 60, graphicDesign: 75, marketing: 88, sale: 70 } },
      { studentCode: 'GD180912', fullName: 'Phan Quốc Việt', email: 'vietpqgd180912@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1802', role: 'Member', skills: { tech: 50, management: 52, graphicDesign: 86, marketing: 50, sale: 45 } },
    ],
  },
  {
    id: 'lg-04',
    code: 'FA26EXE101-04',
    topic: 'EduMatch - Nền tảng tìm kiếm gia sư sinh viên FPT kèm 1-1',
    topicDesc: 'Hệ thống đánh giá năng lực gia sư qua bài test đầu vào và hợp đồng thông minh bảo vệ học phí phụ huynh.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Hoàng Đức Nam',
    majorsSummary: 'SE (2), GD (1), MKT (1), IB (1)',
    balanceScore: 88,
    status: 'Locked',
    members: [
      { studentCode: 'SE181033', fullName: 'Hoàng Đức Nam', email: 'namhdse181033@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1801', role: 'Leader', skills: { tech: 88, management: 82, graphicDesign: 40, marketing: 60, sale: 65 } },
      { studentCode: 'SE180555', fullName: 'Đỗ Mạnh Tuấn', email: 'tuandmse180555@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1803', role: 'Member', skills: { tech: 95, management: 55, graphicDesign: 35, marketing: 40, sale: 30 } },
      { studentCode: 'GD180410', fullName: 'Vũ Thanh Tùng', email: 'tungvtgd180410@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', classCode: 'GD1802', role: 'Member', skills: { tech: 45, management: 50, graphicDesign: 88, marketing: 55, sale: 40 } },
      { studentCode: 'MKT180322', fullName: 'Ngô Thùy Trang', email: 'trangntmkt180322@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1802', role: 'Member', skills: { tech: 30, management: 60, graphicDesign: 65, marketing: 92, sale: 75 } },
      { studentCode: 'IB180155', fullName: 'Đỗ Hoàng Long', email: 'longdhib180155@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', classCode: 'IB1801', role: 'Member', skills: { tech: 35, management: 75, graphicDesign: 40, marketing: 65, sale: 88 } },
    ],
  },
  {
    id: 'lg-05',
    code: 'FA26EXE101-05',
    topic: 'FoodWaste Zero - Ứng dụng bán lại suất ăn cuối ngày giảm 70%',
    topicDesc: 'Mô hình kết nối các chuỗi nhà hàng, tiệm bánh ngọt thanh lý thức ăn sạch cuối ngày nhằm hạn chế lãng phí.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Vũ Thùy Linh',
    majorsSummary: 'MKT (2), SE (1), IB (1), GD (1)',
    balanceScore: 90,
    status: 'Locked',
    members: [
      { studentCode: 'MKT181155', fullName: 'Vũ Thùy Linh', email: 'linhvtmkt181155@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1803', role: 'Leader', skills: { tech: 40, management: 86, graphicDesign: 60, marketing: 95, sale: 85 } },
      { studentCode: 'IB180622', fullName: 'Ngô Phương Thảo', email: 'thaonpib180622@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', classCode: 'IB1802', role: 'Member', skills: { tech: 40, management: 70, graphicDesign: 45, marketing: 65, sale: 90 } },
      { studentCode: 'SE180709', fullName: 'Bùi Gia Huy', email: 'huybgse180709@fpt.edu.vn', major: 'An toàn thông tin (IA)', classCode: 'SE1802', role: 'Member', skills: { tech: 88, management: 60, graphicDesign: 30, marketing: 45, sale: 50 } },
      { studentCode: 'MKT180512', fullName: 'Lê Quốc Bảo', email: 'baolqmkt180512@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1801', role: 'Member', skills: { tech: 35, management: 65, graphicDesign: 55, marketing: 88, sale: 80 } },
      { studentCode: 'GD180399', fullName: 'Phạm Mai Anh', email: 'anhpmgd180399@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', classCode: 'GD1801', role: 'Member', skills: { tech: 40, management: 50, graphicDesign: 90, marketing: 60, sale: 45 } },
    ],
  },
  {
    id: 'lg-06',
    code: 'FA26EXE101-06',
    topic: 'VeloRent - Trạm cho thuê xe đạp điện thông minh khuôn viên FPT',
    topicDesc: 'Trạm sạc tự động mở khóa xe qua mã QR sinh viên, theo dõi lượng carbon tiết kiệm được.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Lê Quang Đạt',
    majorsSummary: 'SE (2), GD (1), MKT (1), BA (1)',
    balanceScore: 87,
    status: 'Locked',
    members: [
      { studentCode: 'SE180901', fullName: 'Lê Quang Đạt', email: 'datlqse180901@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1802', role: 'Leader', skills: { tech: 90, management: 80, graphicDesign: 40, marketing: 50, sale: 60 } },
      { studentCode: 'SE181122', fullName: 'Phan Minh Hoàng', email: 'hoangpmse181122@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1803', role: 'Member', skills: { tech: 85, management: 55, graphicDesign: 35, marketing: 45, sale: 50 } },
      { studentCode: 'GD180555', fullName: 'Cao Bảo Ngọc', email: 'ngoccbgd180555@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1801', role: 'Member', skills: { tech: 35, management: 50, graphicDesign: 90, marketing: 65, sale: 45 } },
      { studentCode: 'MKT180777', fullName: 'Nguyễn Tấn Phát', email: 'phatntmkt180777@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1802', role: 'Member', skills: { tech: 30, management: 60, graphicDesign: 50, marketing: 90, sale: 82 } },
      { studentCode: 'BA180444', fullName: 'Trần Thảo Ly', email: 'lyttba180444@fpt.edu.vn', major: 'Quản trị kinh doanh (BA)', classCode: 'IB1802', role: 'Member', skills: { tech: 35, management: 78, graphicDesign: 45, marketing: 70, sale: 88 } },
    ],
  },
  {
    id: 'lg-07',
    code: 'FA26EXE101-07',
    topic: 'CareerPath - Trợ lý AI định hướng thực tập và phỏng vấn thử',
    topicDesc: 'Mô phỏng phỏng vấn kỹ thuật với AI interviewer, chấm điểm biểu cảm và ngữ điệu câu trả lời của ứng viên.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Đinh Tuấn Kiệt',
    majorsSummary: 'SE (2), AI (1), MKT (1), GD (1)',
    balanceScore: 89,
    status: 'Locked',
    members: [
      { studentCode: 'SE180833', fullName: 'Đinh Tuấn Kiệt', email: 'kietdtse180833@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1801', role: 'Leader', skills: { tech: 92, management: 84, graphicDesign: 40, marketing: 55, sale: 60 } },
      { studentCode: 'AI180211', fullName: 'Hồ Gia Bảo', email: 'baohgai180211@fpt.edu.vn', major: 'Trí tuệ nhân tạo (AI)', classCode: 'SE1801', role: 'Member', skills: { tech: 95, management: 55, graphicDesign: 30, marketing: 40, sale: 35 } },
      { studentCode: 'SE181444', fullName: 'Trần Gia Hân', email: 'hantgse181444@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1802', role: 'Member', skills: { tech: 86, management: 60, graphicDesign: 45, marketing: 50, sale: 45 } },
      { studentCode: 'MKT180611', fullName: 'Dương Gia Mẫn', email: 'mandgmkt180611@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1803', role: 'Member', skills: { tech: 30, management: 65, graphicDesign: 60, marketing: 92, sale: 85 } },
      { studentCode: 'GD180722', fullName: 'Võ Tuyết Nhi', email: 'nhivtgd180722@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1802', role: 'Member', skills: { tech: 40, management: 50, graphicDesign: 92, marketing: 60, sale: 40 } },
    ],
  },
  {
    id: 'lg-08',
    code: 'FA26EXE101-08',
    topic: 'SafeHostel - Đánh giá phòng trọ và ký hợp đồng bảo chứng số',
    topicDesc: 'Cổng thông tin kiểm chứng an ninh phòng trọ xung quanh khu CNC Hòa Lạc / TP. Thủ Đức, cam kết không tăng giá điện nước ảo.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Nguyễn Thanh Tùng',
    majorsSummary: 'SE (2), MKT (1), GD (1), IB (1)',
    balanceScore: 86,
    status: 'Locked',
    members: [
      { studentCode: 'SE180311', fullName: 'Nguyễn Thanh Tùng', email: 'tungntse180311@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1803', role: 'Leader', skills: { tech: 88, management: 80, graphicDesign: 45, marketing: 55, sale: 65 } },
      { studentCode: 'SE180422', fullName: 'Lê Anh Khoa', email: 'khoalase180422@fpt.edu.vn', major: 'Hệ thống thông tin (IS)', classCode: 'SE1802', role: 'Member', skills: { tech: 85, management: 60, graphicDesign: 40, marketing: 40, sale: 45 } },
      { studentCode: 'MKT180199', fullName: 'Trần Hải Đăng', email: 'dangthmkt180199@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1801', role: 'Member', skills: { tech: 35, management: 65, graphicDesign: 55, marketing: 90, sale: 80 } },
      { studentCode: 'GD180133', fullName: 'Bùi Kim Ngân', email: 'nganbkgd180133@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', classCode: 'GD1801', role: 'Member', skills: { tech: 40, management: 52, graphicDesign: 88, marketing: 60, sale: 45 } },
      { studentCode: 'IB180888', fullName: 'Phạm Đức Trọng', email: 'trongpdib180888@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', classCode: 'IB1802', role: 'Member', skills: { tech: 30, management: 76, graphicDesign: 40, marketing: 65, sale: 92 } },
    ],
  },
  {
    id: 'lg-09',
    code: 'FA26EXE101-09',
    topic: 'FPT Craft - Sàn thương mại điện tử sản phẩm Handmade sinh viên',
    topicDesc: 'Nền tảng thương mại chuyên biệt cho các câu lạc bộ nghệ thuật, thủ công mỹ nghệ sinh viên giới thiệu tác phẩm.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Nguyễn Văn Hoàng',
    majorsSummary: 'IB (1), SE (2), MKT (1), GD (1)',
    balanceScore: 90,
    status: 'Locked',
    members: [
      { studentCode: 'IB184201', fullName: 'Nguyễn Văn Hoàng', email: 'hoangnvib184201@fpt.edu.vn', major: 'Kinh doanh quốc tế (IB)', classCode: 'IB1801', role: 'Leader', skills: { tech: 35, management: 88, graphicDesign: 40, marketing: 75, sale: 80 } },
      { studentCode: 'SE181600', fullName: 'Lý Quốc Huy', email: 'huylqse181600@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1801', role: 'Member', skills: { tech: 92, management: 60, graphicDesign: 35, marketing: 40, sale: 45 } },
      { studentCode: 'SE181711', fullName: 'Đỗ Tiến Đạt', email: 'datdtse181711@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1803', role: 'Member', skills: { tech: 88, management: 55, graphicDesign: 40, marketing: 45, sale: 40 } },
      { studentCode: 'MKT180922', fullName: 'Nguyễn Phương Thảo', email: 'thaonpmkt180922@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1802', role: 'Member', skills: { tech: 30, management: 65, graphicDesign: 60, marketing: 94, sale: 82 } },
      { studentCode: 'GD180633', fullName: 'Hồ Mỹ Tâm', email: 'tamhmgd180633@fpt.edu.vn', major: 'Thiết kế đồ họa (GD)', classCode: 'GD1801', role: 'Member', skills: { tech: 40, management: 50, graphicDesign: 95, marketing: 55, sale: 45 } },
    ],
  },
  {
    id: 'lg-10',
    code: 'FA26EXE101-10',
    topic: 'DocTranslate AI - Dịch thuật tài liệu nghiên cứu chuyên ngành',
    topicDesc: 'Bộ công cụ trích xuất công thức LaTeX và bảng biểu song ngữ, hỗ trợ sinh viên đọc báo khoa học IEEE/ACM.',
    memberCount: 5,
    maxMembers: 5,
    leaderName: 'Vũ Đức Thành',
    majorsSummary: 'SE (2), AI (1), MKT (1), GD (1)',
    balanceScore: 88,
    status: 'Locked',
    members: [
      { studentCode: 'SE181822', fullName: 'Vũ Đức Thành', email: 'thanhvdse181822@fpt.edu.vn', major: 'Kỹ thuật phần mềm (SE)', classCode: 'SE1802', role: 'Leader', skills: { tech: 94, management: 82, graphicDesign: 35, marketing: 50, sale: 55 } },
      { studentCode: 'AI180933', fullName: 'Mai Hoàng Long', email: 'longmhai180933@fpt.edu.vn', major: 'Trí tuệ nhân tạo (AI)', classCode: 'SE1801', role: 'Member', skills: { tech: 92, management: 55, graphicDesign: 40, marketing: 45, sale: 40 } },
      { studentCode: 'SE181944', fullName: 'Đặng Tuấn Anh', email: 'anhdtse181944@fpt.edu.vn', major: 'Hệ thống thông tin (IS)', classCode: 'SE1803', role: 'Member', skills: { tech: 86, management: 60, graphicDesign: 40, marketing: 40, sale: 50 } },
      { studentCode: 'MKT181055', fullName: 'Bùi Thị Hà', email: 'habtmkt181055@fpt.edu.vn', major: 'Digital Marketing (MKT)', classCode: 'MKT1801', role: 'Member', skills: { tech: 35, management: 65, graphicDesign: 55, marketing: 90, sale: 80 } },
      { studentCode: 'GD180866', fullName: 'Ngô Gia Hưng', email: 'hungnggd180866@fpt.edu.vn', major: 'Thiết kế mỹ thuật số (GD)', classCode: 'GD1802', role: 'Member', skills: { tech: 45, management: 50, graphicDesign: 88, marketing: 60, sale: 45 } },
    ],
  },
];

export const LecturerDashboardPage: React.FC = () => {
  const [selectedCourse, setSelectedCourse] = useState<'EXE101' | 'EXE201'>('EXE101');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGroupModal, setSelectedGroupModal] = useState<LecturerGroup | null>(null);

  // Compute average radar skills of a group
  const computeGroupAverageSkills = (members: GroupMember[]) => {
    if (!members.length) return { tech: 0, management: 0, graphicDesign: 0, marketing: 0, sale: 0 };
    const sum = members.reduce(
      (acc, m) => ({
        tech: acc.tech + m.skills.tech,
        management: acc.management + m.skills.management,
        graphicDesign: acc.graphicDesign + m.skills.graphicDesign,
        marketing: acc.marketing + m.skills.marketing,
        sale: acc.sale + m.skills.sale,
      }),
      { tech: 0, management: 0, graphicDesign: 0, marketing: 0, sale: 0 }
    );
    const n = members.length;
    return {
      tech: Math.round(sum.tech / n),
      management: Math.round(sum.management / n),
      graphicDesign: Math.round(sum.graphicDesign / n),
      marketing: Math.round(sum.marketing / n),
      sale: Math.round(sum.sale / n),
    };
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    // Generate UTF-8 BOM CSV
    const headers = [
      'Mã nhóm',
      'Tên đề tài',
      'Trạng thái',
      'Họ tên thành viên',
      'MSSV',
      'Email FPT',
      'Chuyên ngành',
      'Lớp FAP',
      'Vai trò',
      'Điểm Tech',
      'Điểm Management',
      'Điểm Graphic Design',
      'Điểm Marketing',
      'Điểm Sale',
    ];

    const rows: string[] = [];
    LECTURER_GROUPS.forEach((group) => {
      group.members.forEach((m) => {
        rows.push([
          `"${group.code}"`,
          `"${group.topic.replace(/"/g, '""')}"`,
          `"${group.status === 'Locked' ? 'Đã chốt sổ' : 'Đã đóng tuyển'}"`,
          `"${m.fullName}"`,
          `"${m.studentCode}"`,
          `"${m.email}"`,
          `"${m.major}"`,
          `"${m.classCode}"`,
          `"${m.role === 'Leader' ? 'Trưởng nhóm' : 'Thành viên'}"`,
          m.skills.tech,
          m.skills.management,
          m.skills.graphicDesign,
          m.skills.marketing,
          m.skills.sale,
        ].join(','));
      });
    });

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Danh_sach_nhom_cham_diem_${selectedCourse}_Fall2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredGroups = LECTURER_GROUPS.filter(
    (g) =>
      g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.leaderName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '0 0 3rem 0', maxWidth: 1560, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#64748B',
              marginBottom: '6px',
            }}
          >
            <span>Giảng viên & Chấm điểm</span>
            <span style={{ color: '#CBD5E1' }}>/</span>
            <span style={{ color: '#334155', fontWeight: 600 }}>Dashboard giám sát & Xuất báo cáo</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 650, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Dashboard Giảng viên & Xuất Báo cáo Chấm điểm
          </h1>
          <p style={{ color: '#64748B', fontSize: '14.5px', margin: 0, lineHeight: 1.5 }}>
            Theo dõi tiến độ ghép nhóm học phần EXE, giám sát cơ cấu đa ngành và tải danh sách nhóm chính thức phục vụ công tác chấm điểm.
          </p>
        </div>

        {/* Course Select & CSV Export Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value as any)}
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 12,
              border: '1px solid var(--border-medium, #CBD5E1)',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-main, #0F172A)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="EXE101">Học kỳ Fall 2026 • EXE101</option>
            <option value="EXE201">Học kỳ Fall 2026 • EXE201</option>
          </select>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              height: 40,
              padding: '0 18px',
              borderRadius: 12,
              backgroundColor: '#15803D',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(21, 128, 61, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Download size={16} />
            Xuất danh sách nhóm chấm điểm (.CSV)
          </button>
        </div>
      </div>

      {/* 4 Overview Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Card 1 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tổng SV Đủ Điều Kiện
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            50
          </div>
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <CheckCircle2 size={13} color="#10B981" /> 100% sinh viên có tên trên FAP
          </span>
        </div>

        {/* Card 2 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tỷ lệ Đã Ghép Nhóm
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            100%
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
            50/50 sinh viên đã có nhóm chính thức
          </span>
        </div>

        {/* Card 3 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Tổng Số Nhóm Hoàn Chỉnh
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main, #0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            10 nhóm
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)', marginTop: '4px', display: 'block' }}>
            10/10 nhóm đạt sĩ số 5 thành viên
          </span>
        </div>

        {/* Card 4 */}
        <div
          style={{
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '20px',
            padding: '26px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-muted, #64748B)' }}>
              Cân Bằng Đa Ngành TB
            </span>
            <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color, #F26F21)' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
            89%
          </div>
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <Sparkles size={13} color="var(--accent-color, #F26F21)" /> Đạt tiêu chuẩn đánh giá EXE
          </span>
        </div>
      </div>

      {/* Group Table Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #FFFFFF)',
          border: '1px solid var(--border-light, #E2E8F0)',
          borderRadius: '20px',
          padding: '26px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0F172A)', margin: 0 }}>
              Danh sách Toàn bộ Các Nhóm Trong Môn ({filteredGroups.length} nhóm)
            </h3>
            <span style={{ fontSize: '14px', color: 'var(--text-muted, #64748B)' }}>
              Bấm vào bất kỳ nhóm nào để xem chi tiết danh sách thành viên và biểu đồ ngũ giác 5 kỹ năng
            </span>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-light, #94A3B8)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã nhóm, tên đề tài hoặc trưởng nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 36,
                paddingLeft: '2rem',
                paddingRight: '10px',
                borderRadius: 10,
                border: '1px solid var(--border-medium, #CBD5E1)',
                backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle, #F8FAFC)', borderBottom: '1px solid var(--border-light, #E2E8F0)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Mã nhóm</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Đề tài dự kiến</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Sĩ số</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trưởng nhóm</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Cơ cấu chuyên ngành</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Cân bằng kỹ năng</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main, #0F172A)', textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((g) => (
                <tr
                  key={g.id}
                  onClick={() => setSelectedGroupModal(g)}
                  style={{
                    borderBottom: '1px solid var(--border-subtle, #F1F5F9)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle, #F8FAFC)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: '#C2410C' }}>
                    {g.code}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main, #0F172A)', maxWidth: 260 }}>
                    {g.topic}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '13px', fontWeight: 600, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {g.memberCount}/{g.maxMembers}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-main, #0F172A)', fontWeight: 600 }}>
                    {g.leaderName}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted, #64748B)', fontSize: '14px' }}>
                    {g.majorsSummary}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '13.5px', fontWeight: 700, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C', fontVariantNumeric: 'tabular-nums' }}>
                      {g.balanceScore}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '2px 9px', borderRadius: 999, fontSize: '13px', fontWeight: 600, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#334155' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: '#10B981' }} />
                      Đã chốt sổ
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupModal(g);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-medium, #CBD5E1)',
                        backgroundColor: 'var(--bg-card, #FFFFFF)',
                        color: 'var(--text-main, #0F172A)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Eye size={13} />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group Detail & Radar Chart Modal */}
      {selectedGroupModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '26px',
          }}
          onClick={() => setSelectedGroupModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 780,
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-light, #E2E8F0)', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 800, fontSize: '17px', color: '#0054A6', backgroundColor: '#EFF6FF', padding: '3px 10px', borderRadius: 6, border: '1px solid #BFDBFE' }}>
                    {selectedGroupModal.code}
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 700, backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}>
                    Sĩ số: {selectedGroupModal.memberCount}/{selectedGroupModal.maxMembers} thành viên
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '14px', fontWeight: 800, backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7C3AED' }}>
                    Cân bằng: {selectedGroupModal.balanceScore}%
                  </span>
                </div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main, #0F172A)', margin: '4px 0' }}>
                  {selectedGroupModal.topic}
                </h2>
                <p style={{ fontSize: '15px', color: 'var(--text-muted, #64748B)', margin: 0 }}>
                  {selectedGroupModal.topicDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: '1px solid var(--border-light, #E2E8F0)',
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #64748B)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Split: Member Table vs Radar Chart */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '16px' }}>
              {/* Member List */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px' }}>
                  Danh sách Thành viên Chính thức ({selectedGroupModal.members.length} SV)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedGroupModal.members.map((m) => (
                    <div
                      key={m.studentCode}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                        border: '1px solid var(--border-light, #E2E8F0)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontWeight: 650, fontSize: '15px', color: 'var(--text-main, #0F172A)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span>{m.fullName}</span>
                          {m.role === 'Leader' && (
                            <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '1px 7px', borderRadius: 5, backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155' }}>
                              Trưởng nhóm
                            </span>
                          )}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
                          {m.studentCode}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                        {m.major} • Lớp {m.classCode} • {m.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5-Skills Radar Chart */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0F172A)', marginBottom: '10px' }}>
                  Biểu đồ Ngũ giác Năng lực Nhóm (SVG Radar)
                </h4>
                {(() => {
                  const avg = computeGroupAverageSkills(selectedGroupModal.members);
                  // Radar geometry: center at (150, 130), radius = 80
                  const cx = 150;
                  const cy = 130;
                  const r = 75;
                  const angles = [-90, -18, 54, 126, 198].map((deg) => (deg * Math.PI) / 180);
                  const skillValues = [
                    avg.tech,
                    avg.management,
                    avg.graphicDesign,
                    avg.marketing,
                    avg.sale,
                  ];
                  const labels = ['Tech', 'Management', 'Graphic Design', 'Marketing', 'Sale'];

                  // Calculate polygon points
                  const points = angles.map((ang, i) => {
                    const dist = (skillValues[i] / 100) * r;
                    const x = cx + dist * Math.cos(ang);
                    const y = cy + dist * Math.sin(ang);
                    return `${x},${y}`;
                  }).join(' ');

                  // Grid background rings
                  const rings = [0.25, 0.5, 0.75, 1.0];

                  return (
                    <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-subtle, #F8FAFC)', padding: '16px', borderRadius: 12, border: '1px solid var(--border-light, #E2E8F0)' }}>
                      <svg width="300" height="260" viewBox="0 0 300 260" style={{ overflow: 'visible', margin: '0 auto' }}>
                        {/* Rings */}
                        {rings.map((factor, idx) => {
                          const ringPoints = angles.map((ang) => {
                            const x = cx + r * factor * Math.cos(ang);
                            const y = cy + r * factor * Math.sin(ang);
                            return `${x},${y}`;
                          }).join(' ');
                          return (
                            <polygon
                              key={idx}
                              points={ringPoints}
                              fill="none"
                              stroke="var(--border-medium, #CBD5E1)"
                              strokeWidth="1"
                              strokeDasharray={idx < 3 ? '2,2' : undefined}
                            />
                          );
                        })}

                        {/* Axes */}
                        {angles.map((ang, i) => {
                          const x = cx + r * Math.cos(ang);
                          const y = cy + r * Math.sin(ang);
                          return (
                            <line
                              key={i}
                              x1={cx}
                              y1={cy}
                              x2={x}
                              y2={y}
                              stroke="var(--border-medium, #CBD5E1)"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Skill Value Polygon */}
                        <polygon
                          points={points}
                          fill="var(--accent-soft, rgba(242, 111, 33, 0.22))"
                          stroke="var(--accent-color, #F26F21)"
                          strokeWidth="2.5"
                        />

                        {/* Vertex Dots & Labels */}
                        {angles.map((ang, i) => {
                          const dist = (skillValues[i] / 100) * r;
                          const dotX = cx + dist * Math.cos(ang);
                          const dotY = cy + dist * Math.sin(ang);
                          const labelX = cx + (r + 24) * Math.cos(ang);
                          const labelY = cy + (r + 14) * Math.sin(ang);

                          return (
                            <g key={i}>
                              <circle cx={dotX} cy={dotY} r="4" fill="var(--accent-color, #F26F21)" />
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="11"
                                fontWeight="700"
                                fill="var(--text-main, #0F172A)"
                              >
                                {labels[i]}: {skillValues[i]}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px', fontSize: '13px', color: 'var(--text-muted, #64748B)' }}>
                        <span>Tech: <strong>{avg.tech}</strong></span>
                        <span>Mgt: <strong>{avg.management}</strong></span>
                        <span>GD: <strong>{avg.graphicDesign}</strong></span>
                        <span>MKT: <strong>{avg.marketing}</strong></span>
                        <span>Sale: <strong>{avg.sale}</strong></span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer close button */}
            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-light, #E2E8F0)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedGroupModal(null)}
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-subtle, #F8FAFC)',
                  border: '1px solid var(--border-medium, #CBD5E1)',
                  color: 'var(--text-main, #0F172A)',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default LecturerDashboardPage;