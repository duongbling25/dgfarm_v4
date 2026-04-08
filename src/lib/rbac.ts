// ============================================================
//  lib/rbac.ts
//  RBAC — Single source of truth cho toàn bộ phân quyền
//
//  Mọi logic "ai được làm gì" đều nằm ở đây.
//  Khi cần thay đổi quyền, chỉ sửa file này, không đụng code khác.
// ============================================================

export type Role = 'admin' | 'manager' | 'staff'

// ── 1. ĐỊNH NGHĨA QUYỀN TRUY CẬP TỪNG ROUTE ────────────────
//
//  Mỗi route prefix → danh sách role được phép vào.
//  Middleware sẽ đọc bảng này để chặn hoặc cho qua.
//
//  Thứ tự quan trọng: route cụ thể hơn phải đứng trước.
//  VD: '/giao-dich/dat-hang/nha-phan-phoi' trước '/giao-dich'

export const ROUTE_PERMISSIONS: { path: string; roles: Role[] }[] = [
  // Admin + Manager
  { path: '/so-quy',    roles: ['admin', 'manager'] },

  // Admin + Manager
  { path: '/bao-cao',         roles: ['admin', 'manager'] },
  { path: '/nhan-vien',       roles: ['admin', 'manager'] },
  { path: '/tai-khoan',       roles: ['admin', 'manager'] },
  { path: '/khach-hang',      roles: ['admin', 'manager'] },
  { path: '/nha-phan-phoi',   roles: ['admin', 'manager'] },

  // Giao dịch NPP: admin + manager
  { path: '/giao-dich/dat-hang/nha-phan-phoi',  roles: ['admin', 'manager'] },
  { path: '/giao-dich/hoa-don/nha-phan-phoi',   roles: ['admin', 'manager'] },

  // Giao dịch KH + Hàng hóa + Dashboard: tất cả
  { path: '/giao-dich/dat-hang/khach-hang',  roles: ['admin', 'manager', 'staff'] },
  { path: '/giao-dich/hoa-don/khach-hang',   roles: ['admin', 'manager', 'staff'] },
  { path: '/hang-hoa',            roles: ['admin', 'manager', 'staff'] },
  { path: '/hang-hoa/kiem-kho',   roles: ['admin', 'manager', 'staff'] },
  { path: '/hang-hoa/thu-hoach',  roles: ['admin', 'manager', 'staff'] },
  { path: '/dashboard',           roles: ['admin', 'manager', 'staff'] },
]

// ── 2. KIỂM TRA QUYỀN TRUY CẬP ROUTE ───────────────────────
//
//  Tìm route match dài nhất (cụ thể nhất) với pathname,
//  rồi kiểm tra role có trong danh sách được phép không.
//  Nếu không match route nào → cho qua (trang công khai).

export function canAccessRoute(pathname: string, role: Role): boolean {
  // Tìm tất cả các route prefix khớp với pathname
  const matched = ROUTE_PERMISSIONS.filter(r =>
    pathname === r.path || pathname.startsWith(r.path + '/')
  )
  // Không có rule nào match → cho qua (ví dụ trang login)
  if (matched.length === 0) return true

  // Lấy rule cụ thể nhất (path dài nhất)
  const rule = matched.reduce((a, b) => a.path.length >= b.path.length ? a : b)
  return rule.roles.includes(role)
}

// ── 3. ĐỊNH NGHĨA MENU NAV THEO ROLE ────────────────────────
//
//  Mỗi nav item có thể giới hạn chỉ cho một số role thấy.
//  Header sẽ đọc bảng này để render menu đúng với từng user.

export interface NavChild {
  label: string
  href:  string
  roles?: Role[]           // undefined = tất cả role thấy
  children?: { label: string; href: string; roles?: Role[] }[]
}

export interface NavItem {
  label:    string
  href:     string
  roles?:   Role[]
  children?: NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan',
    href:  '/dashboard',
    // roles undefined → tất cả thấy
  },
  {
    label: 'Hàng hóa',
    href:  '/hang-hoa',
    children: [
      { label: 'Danh sách hàng hóa', href: '/hang-hoa' },
      { label: 'Kiểm kho',           href: '/hang-hoa/kiem-kho' },
      { label: 'Thu hoạch',          href: '/hang-hoa/thu-hoach' },
    ],
  },
  {
    label: 'Giao dịch',
    href:  '/giao-dich/dat-hang/khach-hang',
    children: [
      {
        label: 'Đặt hàng',
        href:  '/giao-dich/dat-hang/khach-hang',
        children: [
          { label: 'Khách hàng',     href: '/giao-dich/dat-hang/khach-hang' },
          // NPP chỉ admin + manager thấy
          { label: 'Nhà phân phối',  href: '/giao-dich/dat-hang/nha-phan-phoi', roles: ['admin', 'manager'] },
        ],
      },
      {
        label: 'Hóa đơn',
        href:  '/giao-dich/hoa-don/khach-hang',
        children: [
          { label: 'Khách hàng',     href: '/giao-dich/hoa-don/khach-hang' },
          { label: 'Nhà phân phối',  href: '/giao-dich/hoa-don/nha-phan-phoi', roles: ['admin', 'manager'] },
        ],
      },
    ],
  },
  {
    label:  'Đối tác',
    href:   '/khach-hang',
    roles:  ['admin', 'manager'],   // staff không thấy
    children: [
      { label: 'Khách hàng',    href: '/khach-hang' },
      { label: 'Nhà phân phối', href: '/nha-phan-phoi' },
    ],
  },
  {
    label:  'Nhân viên',
    href:   '/nhan-vien',
    roles:  ['admin', 'manager'],
    children: [
      { label: 'Thông tin',           href: '/nhan-vien' },
      { label: 'Danh sách tài khoản', href: '/tai-khoan' },
    ],
  },
  {
    label:  'Sổ quỹ',
    href:   '/so-quy',
    roles:  ['admin', 'manager'],              // admin + manager
  },
  {
    label:  'Báo cáo',
    href:   '/bao-cao',
    roles:  ['admin', 'manager'],
  },
]

// ── 4. FILTER NAV THEO ROLE ──────────────────────────────────
//
//  Hàm này nhận role hiện tại và trả về danh sách nav
//  đã được lọc — chỉ giữ lại những mục role đó được thấy.

export function getNavForRole(role: Role): NavItem[] {
  return NAV_ITEMS
    .filter(item => !item.roles || item.roles.includes(role))
    .map(item => ({
      ...item,
      children: item.children
        ?.filter(child => !child.roles || child.roles.includes(role))
        .map(child => ({
          ...child,
          children: child.children?.filter(
            sub => !sub.roles || sub.roles.includes(role)
          ),
        })),
    }))
}

// ── 5. KIỂM TRA QUYỀN HÀNH ĐỘNG CỤ THỂ ─────────────────────
//
//  Các quyền hành động (không liên quan đến route),
//  dùng trong component để ẩn/hiện nút bấm.

export const PERMISSIONS = {
  // Xem sổ quỹ
  viewSoQuy:        (role: Role) => role === 'admin' || role === 'manager',

  // Quản lý nhân viên & tài khoản
  manageStaff:      (role: Role) => role === 'admin' || role === 'manager',

  // Tạo chiết khấu — admin không cần PIN, manager cần PIN
  createDiscount:   (role: Role) => role === 'admin' || role === 'manager',
  discountNeedsPIN: (role: Role) => role === 'manager',

  // Xem NPP
  viewNPP:          (role: Role) => role === 'admin' || role === 'manager',

  // Xem báo cáo
  viewReport:       (role: Role) => role === 'admin' || role === 'manager',
} as const