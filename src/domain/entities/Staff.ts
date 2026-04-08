// ── Hồ sơ nhân viên (nhan_su.employees) ──────────────────────
export interface Employee {
  id: string
  name: string
  phone: string | null
  birthday: string | null
  position: string | null
  account_id: string | null
  created_at: string
  account?: Account
}

// ── Tài khoản đăng nhập (nhan_su.accounts) ───────────────────
export interface Account {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff'
  auth_id: string | null
  employee_id: string | null
  pin_hash: string | null
  created_at: string
  employee_name?: string
}

// ── Activity log ──────────────────────────────────────────────
export interface ActivityLog {
  id: number
  account_id: string
  action: string
  target_id: string | null
  note: string | null
  created_at: string
  account_name?: string
}