import { useRef, useState } from 'react';
import {
  ChevronDown,
  BookOpen,
  Headphones,
  Shield,
  CreditCard,
  PiggyBank,
  PieChart,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Wallet,
  Languages,
  Sparkle,
  ClipboardList,
  Users,
  Activity
} from 'lucide-react';
import { apiPost, ApiRequestError } from '../api-client.js';
import type { Copy } from '../i18n.js';
import type { Locale, UserRole } from '../types.js';

interface HelpScreenProps {
  t: Copy;
  locale: Locale;
  csrfToken: string;
  role: UserRole;
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

/** Câu hỏi cho người dùng cuối (giữ nguyên nội dung trang trợ giúp hiện có). */
const USER_FAQS: FaqItem[] = [
  {
    id: 'add-tx',
    category: 'transactions',
    questionVi: 'Làm thế nào để thêm một khoản thu hoặc chi tiêu mới?',
    questionEn: 'How do I add a new income or payment transaction?',
    answerVi: 'Trên trang Tổng quan, chọn "Thêm khoản thu" hoặc "Thêm khoản chi" bên dưới các thẻ số liệu. Bạn cũng có thể mở mục Giao dịch. Nhập số tiền, chọn danh mục phù hợp và lưu giao dịch.',
    answerEn: 'On the Overview page, choose "Add income" or "Add payment" below the summary cards. You can also open Transactions. Enter the amount, choose a category, and save the transaction.',
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

/** Câu hỏi vận hành dành riêng cho admin. */
const ADMIN_FAQS: FaqItem[] = [
  {
    id: 'triage',
    category: 'issues',
    questionVi: 'Quy trình phân loại báo cáo (triage) diễn ra thế nào?',
    questionEn: 'How does report triage work?',
    answerVi: 'Vào Trung tâm vận hành → Hàng đợi hỗ trợ, lọc theo trạng thái/độ ưu tiên, mở chi tiết để đổi status, priority và thêm note nội bộ. P0 là nghi IDOR, lộ dữ liệu hoặc sai invariant — escalate ngay, không sửa ledger trực tiếp.',
    answerEn: 'Open Operations center → Support queue, filter by status/priority, open a report to change status, priority, and add an internal note. P0 means suspected IDOR, data exposure, or invariant failure — escalate immediately and never edit the ledger directly.',
    icon: ClipboardList
  },
  {
    id: 'account-status',
    category: 'accounts',
    questionVi: 'Dừng một tài khoản có xóa dữ liệu của họ không?',
    questionEn: 'Does disabling an account delete their data?',
    answerVi: 'Không. Dừng tài khoản chỉ chuyển status sang disabled, chặn đăng nhập và vô hiệu phiên hiện có. Không xóa dữ liệu, không đổi số dư/ledger và không đổi role. Thao tác bắt buộc nhập lý do và được ghi audit.',
    answerEn: 'No. Disabling only sets status to disabled, blocking login and invalidating existing sessions. It never deletes data, changes balances/ledger, or changes roles. A reason is required and the action is audited.',
    icon: Users
  },
  {
    id: 'metrics',
    category: 'metrics',
    questionVi: 'Chỉ số vận hành lấy từ đâu và có bao gồm tiền của user không?',
    questionEn: 'Where do operations metrics come from, and do they include user money?',
    answerVi: 'Chỉ số là aggregate từ users, issues và audit_events (tổng tài khoản, trạng thái báo cáo, kết quả audit). Hệ thống không hiển thị tổng tiền hay số dư của user như một chỉ số mặc định.',
    answerEn: 'Metrics are aggregates from users, issues, and audit_events (account totals, report status, audit outcomes). User money totals or balances are never shown as a default metric.',
    icon: Activity
  },
  {
    id: 'audit',
    category: 'audit',
    questionVi: 'Nhật ký kiểm toán có sửa hoặc xóa được không?',
    questionEn: 'Can audit logs be edited or deleted?',
    answerVi: 'Không. Audit là append-only: chỉ đọc trên giao diện, không có thao tác sửa/xóa. Mọi thay đổi quyền hoặc trạng thái tài khoản đều sinh thêm dòng audit mới kèm actor, lý do và kết quả.',
    answerEn: 'No. Audit is append-only and read-only in the UI. Every role or account-status change appends a new audit row with actor, reason, and outcome.',
    icon: Shield
  },
  {
    id: 'category-suggestion',
    category: 'operations',
    questionVi: 'Gợi ý danh mục (JEV) có quyền tự quyết định giao dịch không?',
    questionEn: 'Does category suggestion (JEV) have authority over transactions?',
    answerVi: 'Không. Gợi ý chỉ mang tính tham khảo và không bao giờ ghi hay authorize tiền. JEV là tùy chọn, mặc định tắt; khi tắt, lỗi hoặc không đủ tin cậy thì luôn fallback chọn danh mục thủ công.',
    answerEn: 'No. Suggestions are advisory and never write or authorize money. JEV is optional and off by default; when disabled, failing, or inconclusive it always falls back to manual category selection.',
    icon: Sparkle
  },
  {
    id: 'fix-balance',
    category: 'operations',
    questionVi: 'Khi user báo sai số dư hoặc thiếu giao dịch thì xử lý thế nào?',
    questionEn: 'What should I do when a user reports a wrong balance or missing transaction?',
    answerVi: 'Không sửa trực tiếp số dư hay xóa giao dịch. Thu thập case ID, mã giao dịch, thời điểm và dữ liệu tối thiểu, rồi chuyển cho owner kiểm tra projection/ledger. Correction chỉ qua bút toán append-only có lý do và audit.',
    answerEn: 'Never edit balances or delete transactions directly. Collect the case ID, transaction ID, timestamp, and minimal data, then hand off to the owner to check the projection/ledger. Corrections only via append-only entries with a reason and audit.',
    icon: Wallet
  }
];

const SUPPORT_EMAIL = 'meoluoitt1@gmail.com';

export function HelpScreen({ t, locale, csrfToken, role }: HelpScreenProps) {
  const isVi = locale === 'vi';
  const isAdmin = role === 'admin';
  const faqs = isAdmin ? ADMIN_FAQS : USER_FAQS;
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0]?.id ?? null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedbackText, setFeedbackText] = useState('');
  // Giữ cùng idempotency key khi lỗi chưa xác định để retry không tạo report trùng.
  const pendingFeedback = useRef<{ key: string; title: string; description: string } | null>(null);

  function toggleFaq(id: string) {
    setOpenFaq(prev => (prev === id ? null : id));
  }

  async function handleSendFeedback(e: React.FormEvent) {
    e.preventDefault();
    const text = feedbackText.trim();
    if (!text || feedbackState === 'sending') return;
    const payload = pendingFeedback.current ?? { key: crypto.randomUUID(), title: text.slice(0, 160), description: text };
    pendingFeedback.current = payload;
    setFeedbackState('sending');
    try {
      await apiPost(
        '/issues',
        { title: payload.title, description: payload.description, category: 'other' },
        { 'X-CSRF-Token': csrfToken, 'Idempotency-Key': payload.key }
      );
      pendingFeedback.current = null;
      setFeedbackText('');
      setFeedbackState('sent');
    } catch (caught) {
      const status = caught instanceof ApiRequestError ? caught.status : undefined;
      // Only retain the key when the outcome is ambiguous (network/408/5xx); clear it otherwise.
      const ambiguous = status === undefined || status === 408 || status >= 500;
      if (!ambiguous) pendingFeedback.current = null;
      setFeedbackState('error');
    }
  }

  const supportMailto = 'mailto:meoluoitt1@gmail.com';

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
            <h3>
              {isAdmin
                ? (isVi ? 'Câu hỏi vận hành' : 'Operations FAQ')
                : (isVi ? 'Câu hỏi thường gặp' : 'Frequently Asked Questions')}
            </h3>
          </div>

          <div className="faq-accordion-list">
            {faqs.map(faq => {
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
              <strong>{SUPPORT_EMAIL}</strong>
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

            {isAdmin ? (
              feedbackState === 'sent' ? (
                <div className="feedback-success" role="status">
                  <CheckCircle2 size={18} color="#36856e" />
                  <span>{isVi ? 'Cảm ơn bạn! Báo cáo đã được ghi nhận vào hàng đợi hỗ trợ.' : 'Thank you! Your report was recorded in the support queue.'}</span>
                </div>
              ) : (
                <form onSubmit={e => void handleSendFeedback(e)} className="feedback-form">
                  <textarea
                    rows={3}
                    value={feedbackText}
                    maxLength={4000}
                    disabled={feedbackState === 'sending'}
                    onChange={e => setFeedbackText(e.target.value)}
                    aria-describedby="feedback-note"
                    placeholder={isVi ? 'Nhập ý kiến hoặc mô tả vấn đề bạn gặp phải...' : 'Type your suggestions or bug description...'}
                    required
                  />
                  <p id="feedback-note" className="muted">
                    {isVi
                      ? 'Không nhập mật khẩu, mã OTP, cookie hoặc token. Báo cáo sẽ được ghi nhận để hỗ trợ xử lý.'
                      : 'Do not enter passwords, OTPs, cookies, or tokens. Your report is recorded for support to handle.'}
                  </p>
                  {feedbackState === 'error' && (
                    <p role="alert" className="feedback-error">
                      {isVi ? 'Chưa gửi được báo cáo. Vui lòng thử lại.' : 'Could not send the report. Please try again.'}
                    </p>
                  )}
                  <button type="submit" className="primary-button" disabled={!feedbackText.trim() || feedbackState === 'sending'}>
                    {feedbackState === 'sending' ? t.loading : isVi ? 'Gửi ý kiến' : 'Submit feedback'}
                  </button>
                </form>
              )
            ) : (
              <div className="feedback-form">
                <p className="muted">
                  {isVi
                    ? 'Gửi góp ý hoặc báo lỗi qua email hỗ trợ; nội dung sẽ được tiếp nhận và xử lý.'
                    : 'Send feedback or a bug report via the support email; it will be received and handled.'}
                </p>
                <a className="primary-button" href={supportMailto}>
                  {isVi ? 'Mở email hỗ trợ' : 'Open support email'}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
