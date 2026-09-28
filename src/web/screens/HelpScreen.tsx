import { useState } from 'react';
import {
  CircleHelp,
  ChevronDown,
  BookOpen,
  Headphones,
  Shield,
  CreditCard,
  PiggyBank,
  PieChart,
  MessageSquare,
  Sparkles,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import type { Copy } from '../i18n.js';
import type { Locale } from '../types.js';

interface HelpScreenProps {
  t: Copy;
  locale: Locale;
}

interface FaqItem {
  id: string;
  category: string;
  questionVi: string;
  questionEn: string;
  answerVi: string;
  answerEn: string;
  icon: typeof BookOpen;
}

const FAQS: FaqItem[] = [
  {
    id: 'add-tx',
    category: 'transactions',
    questionVi: 'Làm thế nào để thêm một khoản thu hoặc chi tiêu mới?',
    questionEn: 'How do I add a new income or payment transaction?',
    answerVi: 'Bạn có thể bấm vào nút "Thêm giao dịch" màu cam ở góc trên bên phải trang chủ, hoặc chọn tab Giao dịch. Bạn chọn loại giao dịch (Chi tiêu hoặc Thu nhập), nhập số tiền, chọn danh mục phù hợp và nhấn "Lưu giao dịch".',
    answerEn: 'Click the orange "Add transaction" button on the top right of the dashboard, or go to the Transactions tab. Select the type (Payment or Income), enter the amount, select a category, and click "Save transaction".',
    icon: CreditCard
  },
  {
    id: 'savings',
    category: 'savings',
    questionVi: 'Chức năng "Tiết kiệm" hoạt động như thế nào?',
    questionEn: 'How does the "Savings" feature work?',
    answerVi: 'Ví tiết kiệm giúp bạn tách riêng khoản tiền dự trữ khỏi số dư chi tiêu hàng ngày. Bạn có thể nạp tiền vào quỹ tiết kiệm hoặc rút về ví chi tiêu bất cứ lúc nào một cách nhanh chóng.',
    answerEn: 'The savings wallet lets you set aside reserve funds separate from your daily spending balance. You can deposit money into your savings or withdraw back to your main wallet at any time.',
    icon: PiggyBank
  },
  {
    id: 'budget-warning',
    category: 'reports',
    questionVi: 'Cảnh báo vượt ngân sách là gì và có chặn giao dịch không?',
    questionEn: 'What is a budget warning and does it block my payment?',
    answerVi: 'Cảnh báo vượt mức chỉ mang tính chất nhắc nhở khi chi tiêu của bạn vượt quá hạn mức ngân sách tháng đã đặt. Hệ thống không chặn giao dịch để đảm bảo bạn vẫn thanh toán được các nhu cầu cấp bách.',
    answerEn: 'Budget overrun warnings are advisory only. The system does not block payments so you can always complete urgent expenses.',
    icon: PieChart
  },
  {
    id: 'security-google',
    category: 'security',
    questionVi: 'Tài khoản của tôi được bảo mật như thế nào?',
    questionEn: 'How is my account secured?',
    answerVi: 'Campus Coin sử dụng cơ chế đăng nhập Google Single Sign-On (OAuth 2.0) với mã hóa cookie HttpOnly và cơ chế bảo vệ CSRF hai lớp (Double Submit Cookie), ngăn chặn hoàn toàn việc rò rỉ mật khẩu.',
    answerEn: 'Campus Coin uses Google Single Sign-On (OAuth 2.0) with secure HttpOnly cookies and double-submit CSRF tokens, preventing password leaks and cross-site attacks.',
    icon: Shield
  }
];

export function HelpScreen({ t, locale }: HelpScreenProps) {
  const isVi = locale === 'vi';
  const [openFaq, setOpenFaq] = useState<string | null>('add-tx');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  function toggleFaq(id: string) {
    setOpenFaq(prev => (prev === id ? null : id));
  }

  function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSent(false), 4000);
  }

  return (
    <div className="help-page">
      {/* Help Hero Card */}
      <div className="help-hero-card">
        <div className="help-hero-content">
          <div className="help-badge">
            <Sparkles size={14} />
            <span>{isVi ? 'Trung tâm hỗ trợ sinh viên' : 'Student Support Center'}</span>
          </div>
          <h2>{isVi ? 'Chúng tôi có thể giúp gì cho bạn?' : 'How can we help you today?'}</h2>
          <p>
            {isVi
              ? 'Tìm câu trả lời nhanh cho các câu hỏi thường gặp, hướng dẫn sử dụng và kết nối với ban hỗ trợ Campus Coin.'
              : 'Find quick answers to common questions, feature guides, and connect with the Campus Coin team.'}
          </p>
        </div>
      </div>

      <div className="help-grid">
        {/* Left Column: FAQs */}
        <div className="help-faq-column">
          <div className="help-section-title">
            <BookOpen size={18} />
            <h3>{isVi ? 'Câu hỏi thường gặp' : 'Frequently Asked Questions'}</h3>
          </div>

          <div className="faq-accordion-list">
            {FAQS.map(faq => {
              const isOpen = openFaq === faq.id;
              const Icon = faq.icon;
              return (
                <div key={faq.id} className={`faq-card ${isOpen ? 'is-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(faq.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="faq-question-title">
                      <div className="faq-icon">
                        <Icon size={16} />
                      </div>
                      <strong>{isVi ? faq.questionVi : faq.questionEn}</strong>
                    </div>
                    <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'is-rotated' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="faq-answer">
                      <p>{isVi ? faq.answerVi : faq.answerEn}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Contact & Quick Links */}
        <div className="help-contact-column">
          {/* Contact Card */}
          <div className="help-card contact-card">
            <div className="help-card-header">
              <Headphones size={20} className="contact-icon" />
              <div>
                <h4>{isVi ? 'Kênh hỗ trợ trực tiếp' : 'Direct Support'}</h4>
                <p className="muted">{isVi ? 'Phản hồi trong giờ hành chính' : 'Fast response within working hours'}</p>
              </div>
            </div>

            <div className="contact-item">
              <span>{isVi ? 'Email hỗ trợ kỹ thuật:' : 'Technical Support Email:'}</span>
              <strong>support@campuscoin.edu.vn</strong>
            </div>

            <div className="contact-item">
              <span>{isVi ? 'Đường dây nóng trường:' : 'Campus Hotline:'}</span>
              <strong>1900 - CAMPUS (Ext 102)</strong>
            </div>

            <div className="contact-item">
              <span>{isVi ? 'Thời gian làm việc:' : 'Working Hours:'}</span>
              <strong>{isVi ? 'Thứ 2 - Thứ 6 (08:00 - 17:30)' : 'Mon - Fri (08:00 - 17:30)'}</strong>
            </div>
          </div>

          {/* Feedback Card */}
          <div className="help-card feedback-card">
            <div className="help-card-header">
              <MessageSquare size={18} />
              <div>
                <h4>{isVi ? 'Góp ý hoặc báo lỗi' : 'Feedback & Bug Report'}</h4>
                <p className="muted">{isVi ? 'Ý kiến của bạn giúp hệ thống hoàn thiện hơn' : 'Your feedback improves Campus Coin'}</p>
              </div>
            </div>

            {feedbackSent ? (
              <div className="feedback-success">
                <CheckCircle2 size={18} color="#36856e" />
                <span>{isVi ? 'Cảm ơn bạn! Ý kiến đóng góp đã được gửi đi.' : 'Thank you! Your feedback has been sent.'}</span>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="feedback-form">
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={isVi ? 'Nhập ý kiến hoặc mô tả vấn đề bạn gặp phải...' : 'Type your suggestions or bug description...'}
                  required
                />
                <button type="submit" className="primary-button" style={{ alignSelf: 'flex-end', marginTop: '8px' }}>
                  {isVi ? 'Gửi ý kiến' : 'Submit feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
