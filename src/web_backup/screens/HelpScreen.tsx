import { useState } from 'react';
import { BookOpen, ChevronDown, CircleHelp, CreditCard, PieChart, PiggyBank, Shield } from 'lucide-react';
import type { Copy, Locale } from '../types.js';

type Faq = { id: string; question: { vi: string; en: string }; answer: { vi: string; en: string }; Icon: typeof BookOpen };

const faqs: Faq[] = [
  { id: 'transaction', Icon: CreditCard, question: { vi: 'Làm cách nào để ghi nhận giao dịch?', en: 'How do I record a transaction?' }, answer: { vi: 'Trên trang tổng quan, chọn thêm thu nhập hoặc thanh toán, sau đó nhập số tiền và chọn danh mục có sẵn từ máy chủ.', en: 'From the dashboard, choose income or payment, then enter the amount and choose an available server category.' } },
  { id: 'savings', Icon: PiggyBank, question: { vi: 'Quỹ tiết kiệm hoạt động thế nào?', en: 'How does savings work?' }, answer: { vi: 'Bạn có thể chuyển tiền giữa ví và quỹ tiết kiệm. Lịch sử và số dư được tải từ máy chủ.', en: 'You can transfer money between your wallet and savings. History and balances come from the server.' } },
  { id: 'reports', Icon: PieChart, question: { vi: 'Báo cáo và ngân sách lấy dữ liệu ở đâu?', en: 'Where do reports and budgets come from?' }, answer: { vi: 'Báo cáo tháng, chi tiêu theo danh mục và hạn mức ngân sách được tải trực tiếp từ tài khoản của bạn.', en: 'Monthly reports, category spending, and budget limits are loaded directly from your account.' } },
  { id: 'security', Icon: Shield, question: { vi: 'Tài khoản được bảo vệ như thế nào?', en: 'How is my account protected?' }, answer: { vi: 'Các thao tác cập nhật sử dụng phiên đăng nhập và mã CSRF do máy chủ cấp.', en: 'Updates use the signed-in session and server-issued CSRF token.' } },
];

export function HelpScreen({ t, locale }: { t: Copy; locale: Locale }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);
  const isVi = locale === 'vi';
  return <div className="help-page">
    <section className="help-hero-card"><div className="help-hero-content"><span className="help-badge"><CircleHelp size={15} />{isVi ? 'Trung tâm trợ giúp' : 'Help center'}</span><h2>{isVi ? 'Cần trợ giúp?' : 'Need a hand?'}</h2><p>{isVi ? 'Tìm câu trả lời về giao dịch, tiết kiệm, báo cáo và bảo mật tài khoản.' : 'Find answers about transactions, savings, reports, and account security.'}</p></div></section>
    <section className="help-faq-column panel"><div className="help-section-title"><BookOpen size={18} /><h3>{t.faqTitle}</h3></div><div className="faq-accordion-list">{faqs.map(item => { const expanded = open === item.id; const Icon = item.Icon; return <article key={item.id} className={`faq-card ${expanded ? 'is-open' : ''}`}><h4><button type="button" className="faq-question-btn" aria-expanded={expanded} aria-controls={`faq-${item.id}`} onClick={() => setOpen(expanded ? null : item.id)}><span className="faq-question-title"><Icon size={16} />{isVi ? item.question.vi : item.question.en}</span><ChevronDown size={18} className={expanded ? 'is-rotated' : ''} /></button></h4>{expanded && <div id={`faq-${item.id}`} className="faq-answer"><p>{isVi ? item.answer.vi : item.answer.en}</p></div>}</article>; })}</div></section>
    <section className="help-card"><h3>{isVi ? 'Ý kiến hoặc sự cố' : 'Feedback or an issue'}</h3><p>{t.feedbackNotAvailable}</p></section>
  </div>;
}
