'use client'

import React, { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/infrastructure/supabase/client'
import { PgBtn } from '@/presentation/components/ui/SharedUI'
import { getInvoiceWithItemsUseCase } from '@/application/use-cases/order/GetCustomerInvoicesUseCase'
import type { OrderWithItems } from '@/domain/entities/Customer'

const fmt = (n: number) => n.toLocaleString('vi-VN')

type WorkflowStatus = 'Chờ xác nhận' | 'Đã xác nhận' | 'Đang giao' | 'Hoàn thành' | 'Đã hủy' | 'Từ chối'

interface Order {
  id: string
  customer_id: string
  customer_name?: string
  seller: string
  total: number
  status: string
  workflow_status: WorkflowStatus
  ordered_at: string
  handled_by: string | null
  tracking_code: string | null
  note: string | null
}

const wsBadge = (s: WorkflowStatus) => {
  const map: Record<WorkflowStatus, React.CSSProperties> = {
    'Chờ xác nhận': { background: '#FAEEDA', color: '#633806' },
    'Đã xác nhận':  { background: '#E6F1FB', color: '#0C447C' },
    'Đang giao':    { background: '#EEEDFE', color: '#3C3489' },
    'Hoàn thành':   { background: '#EAF3DE', color: '#27500A' },
    'Đã hủy':       { background: '#fee2e2', color: '#b91c1c' },
    'Từ chối':      { background: '#FCEBEB', color: '#791F1F' },
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', ...map[s] }}>{s}</span>
  )
}

const timeAgo = (dateStr: string) => {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return 'Vừa xong'
  if (diff < 60) return `${diff} phút trước`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}h trước`
  return `${Math.floor(h / 24)} ngày trước`
}

const STATUSES: WorkflowStatus[] = ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy', 'Từ chối']

const NEXT_ACTION: Partial<Record<WorkflowStatus, { label: string; next: WorkflowStatus }>> = {
  'Chờ xác nhận': { label: 'Xác nhận', next: 'Đã xác nhận' },
  'Đã xác nhận':  { label: 'Bắt đầu giao', next: 'Đang giao' },
  'Đang giao':    { label: 'Đã giao', next: 'Hoàn thành' },
}

const DATE_OPTS = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Tháng trước']

function getDateRange(opt: string): { from: string; to: string } {
  const now = new Date()
  const f = (d: Date) => d.toISOString().split('T')[0]
  if (opt === 'Hôm nay') { const s = f(now); return { from: s, to: s } }
  if (opt === 'Hôm qua') { const d = new Date(now); d.setDate(d.getDate() - 1); const s = f(d); return { from: s, to: s } }
  if (opt === 'Tuần này') { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1); const e = new Date(d); e.setDate(e.getDate() + 6); return { from: f(d), to: f(e) } }
  if (opt === 'Tuần trước') { const d = new Date(now); d.setDate(d.getDate() - d.getDay() - 6); const e = new Date(d); e.setDate(e.getDate() + 6); return { from: f(d), to: f(e) } }
  if (opt === 'Tháng này') return { from: f(new Date(now.getFullYear(), now.getMonth(), 1)), to: f(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
  if (opt === 'Tháng trước') return { from: f(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: f(new Date(now.getFullYear(), now.getMonth(), 0)) }
  return { from: '', to: '' }
}

// ── DateDropdown ──────────────────────────────────────────────
function DateDropdown({ label, dateFrom, dateTo, onSelect }: {
  label: string
  dateFrom: string
  dateTo: string
  onSelect: (opt: string, from: string, to: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(dateFrom)
  const [customTo, setCustomTo] = useState(dateTo)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 6 }}>
      <div onClick={() => setOpen(p => !p)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', border: '1.5px solid #d0d7e2', borderRadius: 20, cursor: 'pointer', background: '#f7f9fc', fontSize: 13 }}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 300, overflow: 'hidden', marginTop: 4 }}>
          {DATE_OPTS.map(opt => (
            <div key={opt}
              onClick={() => { const r = getDateRange(opt); onSelect(opt, r.from, r.to); setOpen(false) }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f0f5ff'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              {opt}
            </div>
          ))}
          <div style={{ borderTop: '1px solid #eee', padding: '8px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', marginBottom: 8, fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Lựa chọn khác
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Từ ngày</div>
            <input type="date" value={customFrom}
              onChange={e => { setCustomFrom(e.target.value); onSelect('Lựa chọn khác', e.target.value, customTo) }}
              style={{ width: '100%', height: 32, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none', marginBottom: 6 }} />
            <div style={{ fontSize: 12, color: '#888', marginBottom: 3 }}>Đến ngày</div>
            <input type="date" value={customTo}
              onChange={e => { setCustomTo(e.target.value); onSelect('Lựa chọn khác', customFrom, e.target.value) }}
              style={{ width: '100%', height: 32, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── SbCard ────────────────────────────────────────────────────
function SbCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '12px 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#000', marginBottom: 8 }}>{title}</div>
      <hr style={{ border: 'none', borderTop: '1px solid #E0E0E0', margin: '0 0 8px' }} />
      {children}
    </div>
  )
}

interface Props {
  role: 'admin' | 'manager' | 'staff'
  accountId: string
}

export default function OrderTable({ role, accountId }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'Tất cả'>('Tất cả')
  const [activeTab, setActiveTab] = useState<WorkflowStatus | 'Lịch sử'>('Chờ xác nhận')

  // ── FIX 1: Mặc định "Toàn thời gian" — không filter ngày ──
  const [dateLabel, setDateLabel] = useState('Toàn thời gian')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const PER = 10
  const [isPending, startTransition] = useTransition()
  const [confirmAction, setConfirmAction] = useState<{ order: Order; type: 'cancel' | 'reject' } | null>(null)
  const [detail, setDetail] = useState<OrderWithItems | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const openDetail = async (id: string) => {
    setLoadingDetail(true)
    setDetail(null)
    const data = await getInvoiceWithItemsUseCase(id)
    setDetail(data)
    setLoadingDetail(false)
  }

  const supabase = createClient()

  // ── FIX 2: fetchOrders trả về Promise, useEffect await đúng cách ──
  const fetchOrders = useCallback(async (): Promise<void> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .order('ordered_at', { ascending: false })

    if (error) {
      console.error('fetchOrders error:', error.message)
      return
    }

    if (data) {
      setOrders(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any[]).map(o => ({
          id: o.id,
          customer_id: o.customer_id,
          customer_name: o.customers?.name || o.customer_id,
          seller: o.seller ?? '',
          total: o.total ?? 0,
          status: o.status ?? '',
          workflow_status: (o.workflow_status as WorkflowStatus) || 'Chờ xác nhận',
          ordered_at: o.ordered_at,
          handled_by: o.handled_by ?? null,
          tracking_code: o.tracking_code ?? null,
          note: o.note ?? null,
        }))
      )
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── FIX 3: useEffect dùng async IIFE, setLoading sau khi fetch xong ──
  useEffect(() => {
    let active = true
    ;(async () => {
      await fetchOrders()
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [fetchOrders])

  const updateStatus = (orderId: string, next: WorkflowStatus) => {
    startTransition(async () => {
      const { error } = await supabase.from('orders').update({
        workflow_status: next,
        handled_by: accountId,
        ...(next === 'Hoàn thành' ? { status: 'Đã thanh toán' } : {}),
      }).eq('id', orderId)
      if (!error) {
        setOrders(p => p.map(o => o.id === orderId ? { ...o, workflow_status: next } : o))
      }
    })
  }

  const doAction = (orderId: string, type: 'cancel' | 'reject') => {
    const next: WorkflowStatus = type === 'reject' ? 'Từ chối' : 'Đã hủy'
    startTransition(async () => {
      const { error } = await supabase.from('orders').update({
        workflow_status: next,
        status: next,
      }).eq('id', orderId)
      if (!error) {
        setOrders(p => p.map(o => o.id === orderId ? { ...o, workflow_status: next } : o))
      }
      setConfirmAction(null)
    })
  }

  const exportCSV = () => {
    let csv = '\uFEFFMã đơn,Khách hàng,Tổng tiền,Trạng thái,Thời gian\n'
    filtered.forEach(o => {
      csv += [o.id, `"${o.customer_name}"`, o.total, o.workflow_status,
        new Date(o.ordered_at).toLocaleString('vi-VN')].join(',') + '\n'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = 'DGFarm_DonHang.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  // Stats tính trên TOÀN BỘ orders, không bị ảnh hưởng bởi date filter
  const stats = STATUSES.reduce((acc, s) => {
    acc[s] = orders.filter(o => o.workflow_status === s).length
    return acc
  }, {} as Record<WorkflowStatus, number>)

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.id.toLowerCase().includes(q) && !(o.customer_name || '').toLowerCase().includes(q)) return false
    if (statusFilter !== 'Tất cả' && o.workflow_status !== statusFilter) return false

    // Chỉ filter ngày nếu đã chọn (không phải 'Toàn thời gian')
    if (dateFrom || dateTo) {
      const oDate = o.ordered_at?.split('T')[0] || ''
      if (dateFrom && oDate < dateFrom) return false
      if (dateTo && oDate > dateTo) return false
    }

    if (activeTab === 'Lịch sử') {
      return o.workflow_status === 'Hoàn thành'
        || o.workflow_status === 'Đã hủy'
        || o.workflow_status === 'Từ chối'
    }
    return o.workflow_status === activeTab
  })

  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice = filtered.slice((safePage - 1) * PER, safePage * PER)

  const rowGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '36px 110px 1fr 140px 150px 100px 1fr',
    padding: '0 12px', alignItems: 'center', fontSize: 12,
  }

  // RBAC helpers
  const canConfirm = true
  const canReject  = true
  const canCancel  = role === 'admin'
  // manager chỉ xem, không thao tác đơn online

  return (
    <>
      <div style={{ height: 40, background: '#e8e8e8', display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 500 }}>Đặt hàng — Khách hàng</span>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 136px)', background: '#f5f5f5' }}>

        {/* SIDEBAR */}
        <aside style={{ width: 220, minWidth: 220, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '0.5px solid #e0e0e0', background: '#f5f5f5' }}>

          <SbCard title="Thời gian">
            <DateDropdown
              label={dateLabel}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onSelect={(opt, from, to) => {
                setDateLabel(opt)
                setDateFrom(from)
                setDateTo(to)
                setPage(1)
              }}
            />
          </SbCard>

          <SbCard title="Trạng thái">
            {(['Tất cả', ...STATUSES] as const).map(s => (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#555', marginTop: 5, cursor: 'pointer' }}>
                <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #253584', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {statusFilter === s && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#253584' }} />}
                </div>
                <input type="radio" name="ws-filter" checked={statusFilter === s}
                  onChange={() => { setStatusFilter(s); setPage(1) }}
                  style={{ display: 'none' }} />
                {s}
              </label>
            ))}
          </SbCard>

        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
            {([
              ['Chờ xác nhận', '#633806'],
              ['Đã xác nhận',  '#0C447C'],
              ['Đang giao',    '#3C3489'],
              ['Hoàn thành',   '#27500A'],
            ] as const).map(([label, color]) => (
              <div key={label}
                onClick={() => { setActiveTab(label as WorkflowStatus); setPage(1) }}
                style={{
                  background: '#fff', borderRadius: 8, padding: '10px 12px',
                  border: activeTab === label ? `1.5px solid ${color}` : '0.5px solid #e0e0e0',
                  textAlign: 'center', cursor: 'pointer',
                }}>
                <div style={{ fontSize: 20, fontWeight: 500, color }}>{stats[label as WorkflowStatus] || 0}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ width: 320, height: 34, border: '0.5px solid #ccc', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, background: '#fff' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm theo mã đơn, tên khách..."
                style={{ border: 'none', outline: 'none', fontSize: 12, background: 'transparent', width: '100%' }} />
            </div>
            <button onClick={exportCSV}
              style={{ height: 34, background: '#253584', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Xuất file
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid #e0e0e0' }}>
            {(['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Lịch sử'] as const).map(tab => (
              <div key={tab} onClick={() => { setActiveTab(tab); setPage(1) }}
                style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: activeTab === tab ? 500 : 400, color: activeTab === tab ? '#253584' : '#666', borderBottom: activeTab === tab ? '2px solid #253584' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                {tab}
                {tab !== 'Lịch sử' && (
                  <span style={{ marginLeft: 5, background: '#f0f0f0', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>
                    {stats[tab as WorkflowStatus] || 0}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', border: '0.5px solid #e0e0e0', borderTop: 'none', overflow: 'hidden' }}>
            <div style={{ ...rowGrid, background: '#E8F0FE', height: 40, fontWeight: 500, fontSize: 11, color: '#0C447C', borderBottom: '0.5px solid #e0e0e0' }}>
              <div /><div>Mã đơn</div><div>Khách hàng</div>
              <div>Tổng tiền</div><div>Trạng thái</div>
              <div>Thời gian</div><div>Thao tác</div>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>
                Đang tải...
              </div>
            )}
            {!loading && slice.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>
                Không có đơn hàng nào
              </div>
            )}

            {!loading && slice.map(o => {
              const action = NEXT_ACTION[o.workflow_status]

              return (
                <div key={o.id}
                  style={{ ...rowGrid, minHeight: 46, background: '#fff', borderBottom: '0.5px solid #f0f0f0', padding: '7px 12px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fbff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <div><input type="checkbox" style={{ width: 13, height: 13, accentColor: '#253584', cursor: 'pointer' }} /></div>
                  <div>
                    <span
                      onClick={() => openDetail(o.id)}
                      style={{ color: '#253584', fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                    >
                      {o.id}
                    </span>
                  </div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer_name}</div>
                  <div style={{ fontWeight: 500 }}>{fmt(o.total)}</div>
                  <div>{wsBadge(o.workflow_status)}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>{timeAgo(o.ordered_at)}</div>

                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {/* Nút hành động chính — admin & staff */}
                    {action && canConfirm && (
                      <button disabled={isPending}
                        onClick={() => updateStatus(o.id, action.next)}
                        style={{ height: 26, padding: '0 10px', background: '#253584', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {action.label}
                      </button>
                    )}

                    {/* Từ chối — admin & staff, chỉ khi Chờ xác nhận */}
                    {o.workflow_status === 'Chờ xác nhận' && canReject && (
                      <button
                        onClick={() => setConfirmAction({ order: o, type: 'reject' })}
                        style={{ height: 26, padding: '0 10px', background: '#fff', color: '#791F1F', border: '0.5px solid #F09595', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        Từ chối
                      </button>
                    )}

                    {/* Hủy — chỉ admin, sau khi đã xác nhận */}
                    {canCancel && (o.workflow_status === 'Đã xác nhận' || o.workflow_status === 'Đang giao') && (
                      <button
                        onClick={() => setConfirmAction({ order: o, type: 'cancel' })}
                        style={{ height: 26, padding: '0 10px', background: '#fff', color: '#b91c1c', border: '0.5px solid #fca5a5', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        Hủy
                      </button>
                    )}

                    {/* Manager chỉ xem — không có nút thao tác */}
                    {role === 'manager' && (
                      <span style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>Chỉ xem</span>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 12px', borderTop: '0.5px solid #eee', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666', marginRight: 8 }}>Tổng: {filtered.length} đơn</span>
              {pages > 1 && (<>
                <PgBtn disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</PgBtn>
                {Array.from({ length: pages }, (_, i) => (
                  <PgBtn key={i} active={i + 1 === safePage} onClick={() => setPage(i + 1)}>{i + 1}</PgBtn>
                ))}
                <PgBtn disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>›</PgBtn>
              </>)}
            </div>
          </div>
        </main>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px', width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0E176E', marginBottom: 8 }}>
              {confirmAction.type === 'reject' ? 'Từ chối đơn hàng?' : 'Hủy đơn hàng?'}
            </div>
            <div style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
              {confirmAction.type === 'reject'
                ? <>Đơn <strong>{confirmAction.order.id}</strong> sẽ bị từ chối do không đủ hàng.</>
                : <>Đơn <strong>{confirmAction.order.id}</strong> sẽ bị hủy. Không thể hoàn tác!</>
              }
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmAction(null)}
                style={{ flex: 1, height: 36, background: '#eee', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Không
              </button>
              <button
                onClick={() => doAction(confirmAction.order.id, confirmAction.type)}
                disabled={isPending}
                style={{ flex: 1, height: 36, background: confirmAction.type === 'reject' ? '#791F1F' : '#e53e3e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {isPending ? '...' : confirmAction.type === 'reject' ? 'Từ chối' : 'Hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {(loadingDetail || detail) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px 20px', width: 760, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0E176E' }}>
                {loadingDetail ? 'Đang tải...' : `Đơn đặt hàng ${detail?.id}`}
              </span>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {detail && !loadingDetail && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 12, color: '#555', marginBottom: 16, padding: '12px 14px', background: '#f8faff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <span>👤 Khách hàng: <strong style={{ color: '#253584' }}>{detail.customer_id}</strong></span>
                  <span>💰 Người bán: <strong>{detail.seller}</strong></span>
                  <span>🕐 Ngày đặt: {new Date(detail.ordered_at).toLocaleString('vi-VN')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Trạng thái: {wsBadge(detail.workflow_status as WorkflowStatus)}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, border: '1px solid #d0e4f0', borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      {['Mã hàng', 'Tên hàng', 'Số lượng', 'Đơn giá', 'Chiết khấu', 'Thành tiền'].map((hd, i) => (
                        <th key={hd} style={{ background: '#CEE8FF', padding: '10px 12px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 700, fontSize: 12 }}>{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.order_items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #eef2f7' }}>
                        <td style={{ padding: '9px 12px', color: '#253584', fontWeight: 600 }}>{item.product_code}</td>
                        <td style={{ padding: '9px 12px' }}>{item.product_name}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', color: item.discount > 0 ? '#7C4D00' : '#aaa' }}>
                          {item.discount > 0 ? `-${fmt(item.discount)}` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.sell_price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <table style={{ fontSize: 13, minWidth: 280 }}>
                    <tbody>
                      <tr style={{ borderTop: '1px solid #ddd' }}>
                        <td style={{ padding: '8px 8px 4px', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>Tổng thanh toán:</td>
                        <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>{fmt(detail.total)} đ</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {loadingDetail && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', fontSize: 13 }}>Đang tải thông tin đơn hàng...</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}