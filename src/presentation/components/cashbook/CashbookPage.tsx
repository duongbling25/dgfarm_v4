// src/presentation/components/cashbook/CashbookPage.tsx
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  useDanhSachPhieu,
  usePhieuActions,
  useTaiKhoanQuy,
  useLoaiThuChi,
} from '@/presentation/hooks/useCashbook'
import type { PhieuThuChi, TaiKhoanQuy, LoaiThuChi, CashbookLoaiTaiKhoan } from '@/domain/entities/Cashbook'
import type { LapPhieuDTO, ThemTaiKhoanDTO } from '@/application/dto/CashbookDTO'

// ── Utils ──────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('vi-VN')
const fmtDate = (s: string) =>
  new Date(s).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const TABS: { key: CashbookLoaiTaiKhoan | 'tong'; label: string; icon: string }[] = [
  { key: 'tien_mat', label: 'Tiền mặt', icon: '💵' },
  { key: 'ngan_hang', label: 'Ngân hàng', icon: '🏦' },
  { key: 'vi_dien_tu', label: 'Ví điện tử', icon: '💳' },
  { key: 'tong', label: 'Tổng quỹ', icon: '📊' },
]

const NHOM_OPTIONS = [
  { value: 'khach_hang', label: 'Khách hàng' },
  { value: 'nha_cung_cap', label: 'Nhà cung cấp' },
  { value: 'nhan_vien', label: 'Nhân viên' },
  { value: 'khac', label: 'Khác' },
]

// ── ModalLapPhieu ──────────────────────────────────────────────
function ModalLapPhieu({
  kieu, taiKhoanId, taiKhoanTen, loaiList, onClose, onSave, saving,
}: {
  kieu: 'thu' | 'chi'
  taiKhoanId: string
  taiKhoanTen: string
  loaiList: LoaiThuChi[]
  onClose: () => void
  onSave: (data: LapPhieuDTO) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    thoi_gian: new Date().toISOString().slice(0, 16),
    loai_thu_chi_id: '',
    nhom_doi_tuong: 'khac' as any,
    ten_doi_tuong: '',
    gia_tri: '',
    hach_toan_kd: true,
    ghi_chu: '',
  })
  const [showThemLoai, setShowThemLoai] = useState(false)
  const [tenLoaiMoi, setTenLoaiMoi] = useState('')
  const { doThem: themLoai, isPending: addingLoai } = useLoaiThuChi(kieu)

  const loaiFilt = loaiList.filter(l => l.kieu === kieu)
  const color = kieu === 'thu'
    ? { bg: '#10B981', light: '#D1FAE5', text: '#065F46' }
    : { bg: '#EF4444', light: '#FEE2E2', text: '#991B1B' }

  const handleSubmit = (printAfter = false) => {
    if (!form.loai_thu_chi_id) return alert('Vui lòng chọn loại ' + (kieu === 'thu' ? 'thu' : 'chi'))
    const val = Number(form.gia_tri.replace(/\D/g, ''))
    if (!val || val <= 0) return alert('Vui lòng nhập giá trị hợp lệ')
    onSave({
      tai_khoan_quy_id: taiKhoanId,
      thoi_gian: new Date(form.thoi_gian).toISOString(),
      loai_thu_chi_id: form.loai_thu_chi_id,
      nhom_doi_tuong: form.nhom_doi_tuong,
      ten_doi_tuong: form.ten_doi_tuong.trim() || null,
      gia_tri: val,
      hach_toan_kd: form.hach_toan_kd,
      ghi_chu: form.ghi_chu.trim() || null,
    })
    if (printAfter) setTimeout(() => window.print(), 800)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 640, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: color.bg, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 17, margin: 0 }}>
            {kieu === 'thu' ? '+ Lập phiếu thu' : '− Lập phiếu chi'} — {taiKhoanTen}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Mã phiếu */}
          <div>
            <label style={labelStyle}>Mã phiếu</label>
            <input value="Mã phiếu tự động" readOnly style={{ ...inputStyle, color: '#9CA3AF', fontStyle: 'italic' }} />
          </div>
          {/* Thời gian */}
          <div>
            <label style={labelStyle}>Thời gian</label>
            <input type="datetime-local" value={form.thoi_gian}
              onChange={e => setForm(p => ({ ...p, thoi_gian: e.target.value }))}
              style={inputStyle} />
          </div>
          {/* Loại thu/chi */}
          <div>
            <label style={labelStyle}>Loại {kieu === 'thu' ? 'thu' : 'chi'} *</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select value={form.loai_thu_chi_id}
                onChange={e => setForm(p => ({ ...p, loai_thu_chi_id: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}>
                <option value="">Tìm loại {kieu}...</option>
                {loaiFilt.map(l => <option key={l.id} value={l.id}>{l.ten}</option>)}
              </select>
              <button onClick={() => setShowThemLoai(!showThemLoai)}
                style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: '#253584' }}>+</button>
            </div>
            {showThemLoai && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input value={tenLoaiMoi} onChange={e => setTenLoaiMoi(e.target.value)}
                  placeholder="Tên loại mới..." style={{ ...inputStyle, flex: 1, marginBottom: 0 }} />
                <button disabled={addingLoai}
                  onClick={() => {
                    if (!tenLoaiMoi.trim()) return
                    themLoai({ ten: tenLoaiMoi, mo_ta: null, kieu, hach_toan_kd: true }, () => {
                      setTenLoaiMoi(''); setShowThemLoai(false)
                    })
                  }}
                  style={{ padding: '0 12px', background: '#006E1C', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Thêm
                </button>
              </div>
            )}
          </div>
          {/* Giá trị */}
          <div>
            <label style={labelStyle}>Giá trị (VNĐ) *</label>
            <input value={form.gia_tri} placeholder="0"
              onChange={e => setForm(p => ({ ...p, gia_tri: e.target.value.replace(/[^0-9]/g, '') }))}
              style={{ ...inputStyle, textAlign: 'right', fontSize: 20, fontWeight: 800, color: color.bg }} />
          </div>
          {/* Nhóm đối tượng */}
          <div>
            <label style={labelStyle}>Nhóm người {kieu === 'thu' ? 'nộp' : 'nhận'}</label>
            <select value={form.nhom_doi_tuong}
              onChange={e => setForm(p => ({ ...p, nhom_doi_tuong: e.target.value as any }))}
              style={inputStyle}>
              {NHOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Tên đối tượng */}
          <div>
            <label style={labelStyle}>Tên người {kieu === 'thu' ? 'nộp' : 'nhận'}</label>
            <input value={form.ten_doi_tuong} placeholder="Tìm kiếm..."
              onChange={e => setForm(p => ({ ...p, ten_doi_tuong: e.target.value }))}
              style={inputStyle} />
          </div>
          {/* Ghi chú */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Ghi chú</label>
            <textarea value={form.ghi_chu} placeholder="Nhập nội dung chi tiết..."
              onChange={e => setForm(p => ({ ...p, ghi_chu: e.target.value }))}
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', padding: '8px 12px' }} />
          </div>
          {/* Hạch toán */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="ht" checked={form.hach_toan_kd}
              onChange={e => setForm(p => ({ ...p, hach_toan_kd: e.target.checked }))}
              style={{ width: 15, height: 15, accentColor: '#006E1C' }} />
            <label htmlFor="ht" style={{ fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              Hạch toán vào kết quả hoạt động kinh doanh
            </label>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>Bỏ qua</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={saving} onClick={() => handleSubmit(true)}
              style={{ ...btnStyle, background: '#253584', opacity: saving ? 0.6 : 1 }}>
              🖨 Lưu & In
            </button>
            <button disabled={saving} onClick={() => handleSubmit(false)}
              style={{ ...btnStyle, background: color.bg, opacity: saving ? 0.6 : 1 }}>
              💾 Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ModalTaiKhoan ──────────────────────────────────────────────
function ModalTaiKhoan({
  existing, onClose, onSave, saving,
}: {
  existing?: TaiKhoanQuy
  onClose: () => void
  onSave: (d: ThemTaiKhoanDTO) => void
  saving: boolean
}) {
  const [form, setForm] = useState<ThemTaiKhoanDTO>({
    ten_tai_khoan: existing?.ten_tai_khoan ?? '',
    so_tai_khoan: existing?.so_tai_khoan ?? null,
    ngan_hang: existing?.ngan_hang ?? null,
    chu_tai_khoan: existing?.chu_tai_khoan ?? null,
    loai: (existing?.loai as any) ?? 'ngan_hang',
    la_mac_dinh: existing?.la_mac_dinh ?? false,
    so_du_dau_ky: existing?.so_du_dau_ky ?? 0,
    ghi_chu: existing?.ghi_chu ?? null,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 480, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 800, fontSize: 16, margin: 0, color: '#111827' }}>
            {existing ? 'Sửa tài khoản' : 'Thêm tài khoản'}
          </h3>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {([
            { label: 'Tên tài khoản *', key: 'ten_tai_khoan' },
            { label: 'Số tài khoản', key: 'so_tai_khoan' },
            { label: 'Ngân hàng', key: 'ngan_hang' },
            { label: 'Chủ tài khoản', key: 'chu_tai_khoan' },
          ] as const).map(({ label, key }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input value={(form as any)[key] ?? ''} style={inputStyle}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value || null }))} />
            </div>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.la_mac_dinh}
              onChange={e => setForm(p => ({ ...p, la_mac_dinh: e.target.checked }))}
              style={{ width: 15, height: 15, accentColor: '#006E1C' }} />
            <span style={{ fontSize: 13, color: '#374151' }}>Tài khoản mặc định</span>
          </label>
        </div>
        <div style={{ padding: '14px 24px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>Bỏ qua</button>
          <button disabled={saving} onClick={() => onSave(form)}
            style={{ ...btnStyle, background: '#006E1C', opacity: saving ? 0.6 : 1 }}>
            💾 Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ModalConfirmHuy ────────────────────────────────────────────
function ModalConfirmHuy({ maPhieu, onClose, onConfirm, saving }: {
  maPhieu: string; onClose: () => void; onConfirm: () => void; saving: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 8 }}>Hủy phiếu</h3>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
          Bạn chắc chắn muốn hủy phiếu <strong style={{ color: '#111827' }}>{maPhieu}</strong>?
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: '#fff', color: '#6B7280' }}>Bỏ qua</button>
          <button disabled={saving} onClick={onConfirm}
            style={{ ...btnStyle, background: '#DC2626', opacity: saving ? 0.6 : 1 }}>
            ✓ Đồng ý
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function CashbookPage() {
  const [activeTab, setActiveTab] = useState<CashbookLoaiTaiKhoan | 'tong'>('tien_mat')
  const [modal, setModal] = useState<null | 'thu' | 'chi' | 'tai-khoan' | 'sua-tai-khoan'>(null)
  const [editTK, setEditTK] = useState<TaiKhoanQuy | null>(null)
  const [huyTarget, setHuyTarget] = useState<{ id: string; ma: string } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // FIX: Khởi tạo filter không có tai_khoan_quy_id, sau đó sync khi activeTK thay đổi
  const { result, loading, filter, setFilter, refresh } = useDanhSachPhieu({})

  const {
    list: taiKhoanList,
    tongQuy,
    loading: tkLoading,
    isPending: tkPending,
    error: tkError,
    refresh: refreshTK,
    doThem: doThemTK,
    doSua: doSuaTK,
    doXoa: doXoaTK,
  } = useTaiKhoanQuy(filter.tu_ngay, filter.den_ngay)

  // FIX: Tính activeTK từ taiKhoanList (loại tien_mat không cần tạo tài khoản, luôn dùng first match)
  // Thêm state chọn tài khoản con (dùng khi 1 loại có nhiều TK)
  const [selectedTKId, setSelectedTKId] = useState<string | null>(null)

  // FIX: Tính activeTK từ taiKhoanList (loại tien_mat không cần tạo tài khoản, luôn dùng first match)
  const activeTK = useMemo(() => {
    if (activeTab === 'tong') return null
    const byLoai = taiKhoanList.filter(t => t.loai === activeTab)
    if (selectedTKId) {
      const found = byLoai.find(t => t.id === selectedTKId)
      if (found) return found
    }
    return byLoai.find(t => t.la_mac_dinh) ?? byLoai[0] ?? null
  }, [activeTab, taiKhoanList, selectedTKId])

  // FIX: Đồng bộ tai_khoan_quy_id vào filter sau khi taiKhoanList load xong
  const activeTKId = activeTK?.id || undefined
  useEffect(() => {
    setFilter(prev => {
      const nextId = activeTab === 'tong' ? undefined : activeTKId
      if (prev.tai_khoan_quy_id === nextId) return prev
      return { ...prev, tai_khoan_quy_id: nextId, page: 1 }
    })
  }, [activeTKId, activeTab])

  // Đổi tab → chỉ set activeTab, useEffect trên sẽ cập nhật filter
  const changeTab = (tab: CashbookLoaiTaiKhoan | 'tong') => {
    setActiveTab(tab)
    setSelectedTKId(null)
    setExpanded(null)
  }

  const { isPending: phieuPending, error: phieuError, doLapThu, doLapChi, doHuy } = usePhieuActions(() => {
    refresh(); refreshTK()
  })
  const { list: loaiList } = useLoaiThuChi()

  // Tổng quỹ theo tab active
  const tongActive = useMemo(() => {
    if (activeTab === 'tong') {
      if (tongQuy.length === 0) return null
      return tongQuy.reduce(
        (acc, t) => ({
          ...acc,
          so_du_dau_ky: acc.so_du_dau_ky + t.so_du_dau_ky,
          tong_thu: acc.tong_thu + t.tong_thu,
          tong_chi: acc.tong_chi + t.tong_chi,
          ton_quy: acc.ton_quy + t.ton_quy,
        }),
        { so_du_dau_ky: 0, tong_thu: 0, tong_chi: 0, ton_quy: 0 }
      )
    }
    return tongQuy.find(t => t.id === activeTK?.id) ?? null
  }, [activeTab, tongQuy, activeTK])

  const isSaving = phieuPending || tkPending

  // FIX: Kiểm tra activeTK trước khi mở modal — không dùng alert() trình duyệt
  const handleOpenModal = (type: 'thu' | 'chi') => {
    if (!activeTK) return // nút đã disabled khi !activeTK
    setModal(type)
  }

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 96px)', background: '#F8FAFC', fontFamily: "'Inter', 'Be Vietnam Pro', system-ui, sans-serif" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: 16, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#253584', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bộ lọc</p>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>Quản lý dòng tiền</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 13 }}>🔍</span>
          <input placeholder="Theo mã phiếu" value={filter.tu_khoa ?? ''}
            onChange={e => setFilter(p => ({ ...p, tu_khoa: e.target.value, page: 1 }))}
            style={{ width: '100%', height: 34, paddingLeft: 28, paddingRight: 8, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }} />
        </div>

        {/* Trạng thái */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Trạng thái</p>
          {[{ v: 'da_thanh_toan', l: 'Đã thanh toán' }, { v: 'da_huy', l: 'Đã hủy' }].map(s => (
            <label key={s.v} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={filter.trang_thai === s.v}
                onChange={e => setFilter(p => ({ ...p, trang_thai: e.target.checked ? s.v as any : undefined, page: 1 }))}
                style={{ accentColor: '#253584' }} />
              <span style={{ fontSize: 12, color: '#374151' }}>{s.l}</span>
            </label>
          ))}
        </div>

        {/* Thời gian */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Thời gian</p>
          <input type="date" style={{ width: '100%', height: 32, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, padding: '0 8px', marginBottom: 6, outline: 'none', boxSizing: 'border-box' }}
            value={filter.tu_ngay ?? ''}
            onChange={e => setFilter(p => ({ ...p, tu_ngay: e.target.value || undefined, page: 1 }))} />
          <input type="date" style={{ width: '100%', height: 32, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, padding: '0 8px', outline: 'none', boxSizing: 'border-box' }}
            value={filter.den_ngay ?? ''}
            onChange={e => setFilter(p => ({ ...p, den_ngay: e.target.value || undefined, page: 1 }))} />
        </div>

        {/* Bottom actions */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid #F3F4F6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6B7280', borderRadius: 6, textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            🖨 In báo cáo
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Sổ quỹ</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* FIX: Disable nút khi không có activeTK — không dùng alert() */}
            <button
              onClick={() => handleOpenModal('thu')}
              disabled={!activeTK}
              title={!activeTK ? 'Vui lòng chọn tab Tiền mặt, Ngân hàng hoặc Ví điện tử' : undefined}
              style={{ ...btnStyle, background: activeTK ? '#006E1C' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6, cursor: activeTK ? 'pointer' : 'not-allowed' }}>
              + Lập phiếu thu
            </button>
            <button
              onClick={() => handleOpenModal('chi')}
              disabled={!activeTK}
              title={!activeTK ? 'Vui lòng chọn tab Tiền mặt, Ngân hàng hoặc Ví điện tử' : undefined}
              style={{ ...btnStyle, background: activeTK ? '#DC2626' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6, cursor: activeTK ? 'pointer' : 'not-allowed' }}>
              − Lập phiếu chi
            </button>
            <button style={{ ...btnStyle, background: '#fff', color: '#253584', border: '1px solid #253584', display: 'flex', alignItems: 'center', gap: 6 }}>
              📥 Xuất file
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => changeTab(t.key)}
              style={{
                padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500,
                color: activeTab === t.key ? '#253584' : '#6B7280',
                borderBottom: activeTab === t.key ? '2px solid #253584' : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 0.15s',
              }}>
              {t.icon} {t.label}
              {/* FIX: Hiển thị badge tên tài khoản nếu tab đó đã có TK */}
              {t.key !== 'tong' && (() => {
                const tk = taiKhoanList.find(x => x.loai === t.key)
                return tk ? (
                  <span style={{ fontSize: 10, background: '#EFF6FF', color: '#2563EB', borderRadius: 4, padding: '1px 5px', marginLeft: 2 }}>
                    {tk.ten_tai_khoan}
                  </span>
                ) : null
              })()}
            </button>
          ))}
          {(activeTab === 'ngan_hang' || activeTab === 'vi_dien_tu' || activeTab === 'tien_mat') && (
            <button onClick={() => { setEditTK(null); setModal('tai-khoan') }}
              style={{ marginLeft: 'auto', padding: '6px 14px', border: '1px solid #253584', borderRadius: 6, background: '#fff', color: '#253584', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              + {activeTK ? 'Sửa tài khoản' : 'Thêm tài khoản'}
            </button>
          )}
        </div>

        {/* FIX: Hiển thị thông báo nếu tab chưa có tài khoản (thay vì chặn alert) */}
        {activeTab !== 'tong' && !activeTK && !tkLoading && (
          <div style={{ margin: '12px 24px', padding: '12px 16px', background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8, fontSize: 13, color: '#854D0E', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ Chưa có tài khoản quỹ cho loại <strong>{TABS.find(t => t.key === activeTab)?.label}</strong>. Bấm "Thêm tài khoản" để tạo mới.</span>
          </div>
        )}

        {/* Sub-selector: khi 1 loại có nhiều tài khoản */}
        {activeTab !== 'tong' && taiKhoanList.filter(t => t.loai === activeTab).length > 1 && (
          <div style={{ padding: '8px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {taiKhoanList.filter(t => t.loai === activeTab).map(tk => (
              <button
                key={tk.id}
                onClick={() => setSelectedTKId(tk.id)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                  border: '1px solid',
                  borderColor: activeTK?.id === tk.id ? '#253584' : '#E5E7EB',
                  background: activeTK?.id === tk.id ? '#253584' : '#fff',
                  color: activeTK?.id === tk.id ? '#fff' : '#374151',
                  transition: 'all 0.15s',
                }}>
                {tk.ten_tai_khoan}
                {tk.la_mac_dinh && <span style={{ marginLeft: 4, opacity: 0.7 }}>★</span>}
              </button>
            ))}
          </div>
        )}

        {/* Summary cards */}
        {tongActive && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: '14px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {[
              { label: 'Quỹ đầu kỳ', value: tongActive.so_du_dau_ky, color: '#2563EB', border: '#DBEAFE' },
              { label: 'Tổng thu', value: tongActive.tong_thu, color: '#10B981', border: '#D1FAE5' },
              { label: 'Tổng chi', value: tongActive.tong_chi, color: '#EF4444', border: '#FEE2E2' },
              { label: 'Tồn quỹ', value: tongActive.ton_quy, color: tongActive.ton_quy >= 0 ? '#1E293B' : '#EF4444', border: '#E2E8F0', bold: true },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: `1px solid ${c.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 6px' }}>{c.label}</p>
                <p style={{ fontSize: 22, fontWeight: c.bold ? 900 : 700, color: c.color, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(c.value)} ₫
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  {['Mã phiếu', 'Thời gian', 'Loại thu chi', 'Người nộp/nhận', 'Giá trị', 'Tồn quỹ', ''].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Giá trị' || h === 'Tồn quỹ' ? 'right' : 'left', fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px 16px' }}>
                        <div style={{
                          height: 12, borderRadius: 6,
                          background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.4s infinite',
                          width: j === 0 ? '80%' : j === 4 ? '60%' : '70%',
                        }} />
                      </td>
                    ))}
                  </tr>
                ))}
                {!loading && !result?.data?.length && (
                  <tr><td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>
                        {activeTab === 'tong' ? '📊' : activeTab === 'ngan_hang' ? '🏦' : activeTab === 'vi_dien_tu' ? '💳' : '💵'}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                        {!activeTK && activeTab !== 'tong'
                          ? `Chưa có tài khoản ${TABS.find(t => t.key === activeTab)?.label}`
                          : 'Chưa có phiếu nào trong kỳ này'}
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {!activeTK && activeTab !== 'tong'
                          ? 'Bấm "+ Thêm tài khoản" để bắt đầu'
                          : 'Thử thay đổi bộ lọc hoặc lập phiếu mới'}
                      </div>
                    </div>
                  </td></tr>
                )}
                {result?.data?.map((p, i) => {
                  const isExpanded = expanded === p.id
                  const loaiTen = (p.loai_thu_chi as any)?.ten ?? '—'
                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : p.id)}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          background: isExpanded ? '#EFF6FF' : i % 2 === 0 ? '#fff' : '#FAFAFA',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => !isExpanded && ((e.currentTarget as HTMLElement).style.background = '#F5F8FF')}
                        onMouseLeave={e => !isExpanded && ((e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? '#fff' : '#FAFAFA')}
                      >
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#253584' }}>{p.ma_phieu}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280' }}>{fmtDate(p.thoi_gian)}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{loaiTen}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13 }}>{p.ten_doi_tuong || '—'}</td>
                        <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, textAlign: 'right', color: p.kieu === 'thu' ? '#10B981' : '#EF4444', fontVariantNumeric: 'tabular-nums' }}>
                          {p.kieu === 'chi' ? '−' : '+'}{fmt(p.gia_tri)} ₫
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, textAlign: 'right', color: '#6B7280', fontVariantNumeric: 'tabular-nums' }}>—</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {p.trang_thai === 'da_huy'
                            ? <span style={{ padding: '2px 8px', background: '#FEE2E2', color: '#991B1B', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Đã hủy</span>
                            : <span style={{ padding: '2px 8px', background: '#D1FAE5', color: '#065F46', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>✓</span>
                          }
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, borderBottom: '2px solid #BFDBFE' }}>
                            <div style={{ background: '#EFF6FF', padding: '16px 24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {[
                                    { label: 'Mã phiếu', val: p.ma_phieu, bold: true, color: '#253584' },
                                    { label: 'Thời gian', val: fmtDate(p.thoi_gian) },
                                    { label: 'Giá trị', val: `${fmt(p.gia_tri)} ₫`, bold: true, color: p.kieu === 'thu' ? '#006E1C' : '#DC2626' },
                                    { label: 'Loại thu chi', val: loaiTen },
                                    { label: `Người ${p.kieu === 'thu' ? 'nộp' : 'nhận'}`, val: p.ten_doi_tuong || '—' },
                                  ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{r.label}:</span>
                                      <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 500, color: r.color || '#111827', textAlign: 'right' }}>{r.val}</span>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  {[
                                    { label: 'Chi nhánh', val: p.chi_nhanh || 'Trung tâm' },
                                    { label: 'Trạng thái', val: p.trang_thai === 'da_thanh_toan' ? 'Đã thanh toán' : 'Đã hủy' },
                                    { label: 'Người tạo', val: p.nguoi_dung_tao || 'Admin' },
                                    { label: 'Nhân viên tạo', val: p.nhan_vien_tao || 'Admin' },
                                  ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>{r.label}:</span>
                                      <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', textAlign: 'right' }}>{r.val}</span>
                                    </div>
                                  ))}
                                </div>
                                <div>
                                  <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>Ghi chú</p>
                                  <div style={{ background: '#fff', borderRadius: 8, padding: 10, fontSize: 13, color: '#374151', fontStyle: p.ghi_chu ? 'normal' : 'italic', minHeight: 60, border: '1px solid #BFDBFE' }}>
                                    {p.ghi_chu || 'Không có ghi chú'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button onClick={() => window.print()} style={{ ...btnStyle, background: '#fff', color: '#374151', border: '1px solid #E5E7EB', fontSize: 12 }}>🖨 In</button>
                                {p.trang_thai === 'da_thanh_toan' && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setHuyTarget({ id: p.id, ma: p.ma_phieu }) }}
                                    style={{ ...btnStyle, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontSize: 12 }}>
                                    ✕ Hủy bỏ
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {result && result.total > 0 && (
              <div style={{ padding: '12px 16px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  Hiển thị {((filter.page! - 1) * filter.page_size!) + 1}–{Math.min(filter.page! * filter.page_size!, result.total)} trên {result.total} phiếu
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: Math.min(Math.ceil(result.total / (filter.page_size ?? 20)), 7) }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setFilter(p => ({ ...p, page: n }))}
                      style={{
                        width: 30, height: 30, border: '1px solid',
                        borderColor: filter.page === n ? '#253584' : '#E5E7EB',
                        borderRadius: 6, cursor: 'pointer', fontSize: 12,
                        background: filter.page === n ? '#253584' : '#fff',
                        color: filter.page === n ? '#fff' : '#374151',
                        fontWeight: filter.page === n ? 700 : 400,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(phieuError || tkError) && (
            <div style={{ marginTop: 12, padding: 12, background: '#FEE2E2', borderRadius: 8, fontSize: 13, color: '#991B1B' }}>
              ⚠️ {phieuError || tkError}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {(modal === 'thu' || modal === 'chi') && activeTK && (
        <ModalLapPhieu
          kieu={modal}
          taiKhoanId={activeTK.id}
          taiKhoanTen={activeTK.ten_tai_khoan}
          loaiList={loaiList}
          saving={isSaving}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal === 'thu') doLapThu(data)
            else doLapChi(data)
            setModal(null)
          }}
        />
      )}

      {(modal === 'tai-khoan' || modal === 'sua-tai-khoan') && (
        <ModalTaiKhoan
          existing={editTK ?? undefined}
          saving={isSaving}
          onClose={() => { setModal(null); setEditTK(null) }}
          onSave={(data) => {
            if (editTK) doSuaTK(editTK.id, data, () => { setModal(null); setEditTK(null) })
            else doThemTK(data, () => setModal(null))
          }}
        />
      )}

      {huyTarget && (
        <ModalConfirmHuy
          maPhieu={huyTarget.ma}
          saving={isSaving}
          onClose={() => setHuyTarget(null)}
          onConfirm={() => {
            doHuy(huyTarget.id, () => { setHuyTarget(null); setExpanded(null) })
          }}
        />
      )}
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, border: 'none', borderBottom: '1.5px solid #D1D5DB',
  padding: '0 0 6px', fontSize: 13, background: 'transparent',
  outline: 'none', color: '#111827', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
const btnStyle: React.CSSProperties = {
  padding: '9px 18px', border: 'none', borderRadius: 8,
  cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff',
}