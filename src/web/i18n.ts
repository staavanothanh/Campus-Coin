import type { Locale } from './types.js';

export interface Copy {
  // Shell
  greeting: string;
  overview: string;
  thisMonth: string;
  preview: string;
  workspace: string;
  more: string;
  personal: string;
  personalAccount: string;

  // Navigation
  menu: string;
  dashboard: string;
  transactions: string;
  goals: string;
  reports: string;
  admin: string;
  settings: string;
  help: string;

  // Dashboard
  balance: string;
  income: string;
  spending: string;
  savings: string;
  recent: string;
  seeAll: string;
  addTransaction: string;
  goodStart: string;
  budget: string;
  left: string;

  // Transaction form
  addIncome: string;
  addPayment: string;
  amount: string;
  category: string;
  description: string;
  submit: string;
  close: string;
  selectCategory: string;
  manualCategory: string;
  transactionSaved: string;
  amountInvalid: string;

  // Auth
  signIn: string;
  signInDescription: string;
  signOut: string;

  // Status
  loading: string;
  unavailable: string;
  retry: string;
  noData: string;

  // Errors
  sessionExpired: string;
  csrfFailed: string;
  alreadyProcessed: string;
  rateLimited: string;
  serverError: string;
  validationFailed: string;
  insufficientBalance: string;

  // Budget
  budgetExceeded: string;

  // Settings
  settingsTitle: string;
  language: string;
  appearance: string;

  // Admin
  adminOnly: string;

  // Savings
  savingsTransfer: string;
}

export const copy: Record<Locale, Copy> = {
  vi: {
    // Shell
    greeting: 'Chào buổi sáng, {name}',
    overview: 'Một góc nhìn rõ ràng hơn về tiền của bạn.',
    thisMonth: 'Tháng này',
    preview: 'Bản xem trước giao diện',
    workspace: 'Không gian',
    more: 'Thêm',
    personal: 'Cá nhân',
    personalAccount: 'Tài khoản cá nhân',

    // Navigation
    menu: 'Mở menu',
    dashboard: 'Tổng quan',
    transactions: 'Giao dịch',
    goals: 'Mục tiêu',
    reports: 'Báo cáo',
    admin: 'Quản trị',
    settings: 'Cài đặt',
    help: 'Trợ giúp',

    // Dashboard
    balance: 'Số dư ví',
    income: 'Thu nhập',
    spending: 'Đã chi',
    savings: 'Tiết kiệm',
    recent: 'Giao dịch gần đây',
    seeAll: 'Xem tất cả',
    addTransaction: 'Thêm giao dịch',
    goodStart: 'Bạn đang bắt đầu rất tốt',
    budget: 'Ngân sách tháng này',
    left: 'còn lại',

    // Transaction form
    addIncome: 'Thêm thu nhập',
    addPayment: 'Thêm thanh toán',
    amount: 'Số tiền (VND)',
    category: 'Danh mục',
    description: 'Mô tả (không bắt buộc)',
    submit: 'Lưu giao dịch',
    close: 'Đóng',
    selectCategory: 'Chọn danh mục',
    manualCategory: 'Chọn danh mục thủ công',
    transactionSaved: 'Giao dịch đã lưu',
    amountInvalid: 'Số tiền phải là số nguyên dương',

    // Auth
    signIn: 'Đăng nhập Google',
    signInDescription: 'Theo dõi ví và giao dịch theo cách rõ ràng, riêng tư.',
    signOut: 'Đăng xuất',

    // Status
    loading: 'Đang tải\u2026',
    unavailable: 'Dữ liệu chưa khả dụng',
    retry: 'Thử lại',
    noData: 'Chưa có dữ liệu',

    // Errors
    sessionExpired: 'Phiên đăng nhập đã hết hạn',
    csrfFailed: 'Lỗi bảo mật, vui lòng tải lại trang',
    alreadyProcessed: 'Giao dịch đã được xử lý trước đó',
    rateLimited: 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    serverError: 'Lỗi hệ thống, vui lòng thử lại sau',
    validationFailed: 'Dữ liệu không hợp lệ',
    insufficientBalance: 'Số dư không đủ',

    // Budget
    budgetExceeded: 'Ngân sách đã vượt mức',

    // Settings
    settingsTitle: 'Cài đặt',
    language: 'Ngôn ngữ',
    appearance: 'Giao diện',

    // Admin
    adminOnly: 'Khu vực dành cho quản trị viên',

    // Savings
    savingsTransfer: 'Chuyển tiết kiệm',
  },
  en: {
    // Shell
    greeting: 'Good morning, {name}',
    overview: 'A clearer view of where your money is going.',
    thisMonth: 'This month',
    preview: 'Interface preview',
    workspace: 'Workspace',
    more: 'More',
    personal: 'Personal',
    personalAccount: 'Personal account',

    // Navigation
    menu: 'Open menu',
    dashboard: 'Overview',
    transactions: 'Transactions',
    goals: 'Goals',
    reports: 'Reports',
    admin: 'Admin',
    settings: 'Settings',
    help: 'Help',

    // Dashboard
    balance: 'Wallet balance',
    income: 'Income',
    spending: 'Spent',
    savings: 'Savings',
    recent: 'Recent activity',
    seeAll: 'See all',
    addTransaction: 'Add transaction',
    goodStart: "You're off to a good start",
    budget: "This month\u2019s budget",
    left: 'left',

    // Transaction form
    addIncome: 'Add income',
    addPayment: 'Add payment',
    amount: 'Amount (VND)',
    category: 'Category',
    description: 'Description (optional)',
    submit: 'Save transaction',
    close: 'Close',
    selectCategory: 'Select a category',
    manualCategory: 'Choose category manually',
    transactionSaved: 'Transaction saved',
    amountInvalid: 'Amount must be a positive integer',

    // Auth
    signIn: 'Sign in with Google',
    signInDescription: 'A clear, private view of your wallet and activity.',
    signOut: 'Sign out',

    // Status
    loading: 'Loading\u2026',
    unavailable: 'Data is unavailable',
    retry: 'Retry',
    noData: 'No data yet',

    // Errors
    sessionExpired: 'Session expired',
    csrfFailed: 'Security error, please reload the page',
    alreadyProcessed: 'Transaction was already processed',
    rateLimited: 'Too many requests, please try again later',
    serverError: 'System error, please try again later',
    validationFailed: 'Invalid input',
    insufficientBalance: 'Insufficient balance',

    // Budget
    budgetExceeded: 'Budget exceeded',

    // Settings
    settingsTitle: 'Settings',
    language: 'Language',
    appearance: 'Appearance',

    // Admin
    adminOnly: 'Administrator area',

    // Savings
    savingsTransfer: 'Savings transfer',
  },
};
