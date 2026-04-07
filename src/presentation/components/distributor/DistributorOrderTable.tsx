'use client'

import React, { useState, useTransition, useRef, useEffect } from 'react'
import type { DistributorOrder, DistributorOrderStatus, DistributorOrderWithItems } from '@/domain/entities/DistributorOrder'
import type { Distributor } from '@/domain/entities/Distributor'
import type { Product } from '@/domain/entities/Product'
import type { CreateDistributorOrderInput } from '@/domain/repositories/IDistributorOrderRepository'
import { getDistributorInvoiceWithItemsUseCase } from '@/application/use-cases/order/GetDistributorInvoicesUseCase'

const fmt = (n: number) => n.toLocaleString('vi-VN')

const STATUS_LIST: DistributorOrderStatus[] = ['Chờ giao', 'Đang giao', 'Hoàn thành', 'Đã huỷ']

const statusStyle: Record<string, React.CSSProperties> = {
  'Chờ giao':   { background: '#FAEEDA', color: '#633806', border: '1.5px solid #F0B86E' },
  'Đang giao':  { background: '#EEEDFE', color: '#3C3489', border: '1.5px solid #9B95F5' },
  'Hoàn thành': { background: '#EAF3DE', color: '#27500A', border: '1.5px solid #82C547' },
  'Đã huỷ':    { background: '#FCEBEB', color: '#791F1F', border: '1.5px solid #F09595' },
}

function StatusBadge({ status }: { status: string }) {
  const style = statusStyle[status] ?? { background: '#f0f0f0', color: '#555', border: '1.5px solid #ccc' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', letterSpacing: 0.1,
      ...style,
    }}>
      {status}
    </span>
  )
}

const DATE_OPTS = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Tháng trước']

function getDateRange(opt: string) {
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

interface Props {
  initialOrders: DistributorOrder[]
  distributors: Distributor[]
  products: Product[]
  role: 'admin' | 'manager' | 'staff'
  accountId: string
  onCreateOrder: (input: CreateDistributorOrderInput) => Promise<string>
  onUpdateStatus: (id: string, status: DistributorOrderStatus) => Promise<void>
}

export default function DistributorOrderTable({
  initialOrders,
  distributors,
  products,
  role,
  accountId,
  onCreateOrder,
  onUpdateStatus,
}: Props) {
  const [orders, setOrders] = useState<DistributorOrder[]>(initialOrders)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [dateLabel, setDateLabel] = useState('Tháng này')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showDateDrop, setShowDateDrop] = useState(false)
  const [page, setPage] = useState(1)
  const PER = 10

  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [showPin, setShowPin] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [pinError, setPinError] = useState('')
  const [pendingDiscount, setPendingDiscount] = useState(0)
  const [pendingFormData, setPendingFormData] = useState<CreateDistributorOrderInput | null>(null)

  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(null)

  const [detail, setDetail] = useState<DistributorOrderWithItems | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const openDetail = async (id: string) => {
    setLoadingDetail(true)
    setDetail(null)
    const data = await getDistributorInvoiceWithItemsUseCase(id)
    setDetail(data)
    setLoadingDetail(false)
  }

  const dateRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.id.toLowerCase().includes(q) && !(o.distributor_name ?? '').toLowerCase().includes(q)) return false
    if (statusFilter && o.status !== statusFilter) return false
    if (dateFrom && o.ordered_at < dateFrom) return false
    if (dateTo && o.ordered_at > dateTo + 'T23:59:59') return false
    return true
  })

  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice = filtered.slice((safePage - 1) * PER, safePage * PER)

  const selectDate = (opt: string) => {
    const r = getDateRange(opt)
    setDateFrom(r.from); setDateTo(r.to); setDateLabel(opt); setShowDateDrop(false)
  }

  const handleCreateOrder = (formData: CreateDistributorOrderInput) => {
    if (role !== 'admin' && formData.discount_pct > 0) {
      setPendingFormData(formData)
      setPendingDiscount(formData.discount_pct)
      setShowPin(true)
      return
    }
    doCreate(formData)
  }

  const doCreate = (formData: CreateDistributorOrderInput) => {
    startTransition(async () => {
      const newId = await onCreateOrder(formData)
      const dist = distributors.find(d => d.id === formData.distributor_id)
      const subtotal = formData.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const discAmt = Math.round(subtotal * formData.discount_pct / 100)
      setOrders(prev => [{
        id: newId,
        distributor_id: formData.distributor_id,
        distributor_name: dist?.name ?? '',
        subtotal,
        total: subtotal - discAmt,
        discount_pct: formData.discount_pct,
        discount_confirmed_by: formData.discount_confirmed_by,
        discount_confirmed_at: formData.discount_confirmed_at,
        status: 'Chờ giao',
        ordered_at: new Date().toISOString(),
        delivery_date: formData.delivery_date,
        note: formData.note,
        ordered_by: formData.ordered_by,
      }, ...prev])
      setShowCreate(false)
    })
  }

  const handlePinConfirm = async () => {
    if (!pendingFormData) return
    const res = await fetch('/api/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinValue }),
    })
    const { ok } = await res.json()
    if (!ok) { setPinError('Mã PIN không đúng. Vui lòng thử lại.'); return }
    doCreate({
      ...pendingFormData,
      discount_confirmed_by: accountId,
      discount_confirmed_at: new Date().toISOString(),
    })
    setShowPin(false); setPinValue(''); setPinError(''); setPendingFormData(null)
  }

  const handleUpdateStatus = (id: string, status: DistributorOrderStatus) => {
    startTransition(async () => {
      await onUpdateStatus(id, status)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
    })
  }

  const doCancel = () => {
    if (!showCancelConfirm) return
    handleUpdateStatus(showCancelConfirm, 'Đã huỷ')
    setShowCancelConfirm(null)
  }

  // grid: checkbox | star | mã đơn | NPP | thời gian | tổng tiền | trạng thái | thao tác
  const rowGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '36px 24px 120px 1fr 140px 130px 155px 100px',
    padding: '0 14px',
    alignItems: 'center',
    fontSize: 13,
    gap: 8,
  }

  return (
    <>
      {/* Page title */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', background: '#f0f2f5', paddingLeft: 20, borderBottom: '0.5px solid #e5e7eb' }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1a2560' }}>Đặt hàng</span>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>/ Nhà phân phối</span>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 140px)', background: '#f0f2f5' }}>
        {/* SIDEBAR */}
        <aside style={{ width: 240, minWidth: 240, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SbCard title="Thời gian">
            <div ref={dateRef} style={{ position: 'relative', marginTop: 6 }}>
              <div onClick={() => setShowDateDrop(p => !p)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', border: '0.5px solid #d1d5db', borderRadius: 20, cursor: 'pointer', background: '#fff', fontSize: 13 }}>
                <span style={{ color: '#333' }}>{dateLabel}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
              {showDateDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 200, marginTop: 4, overflow: 'hidden' }}>
                  <DateOpt label="Toàn thời gian" onClick={() => { setDateFrom(''); setDateTo(''); setDateLabel('Toàn thời gian'); setShowDateDrop(false) }} />
                  {DATE_OPTS.map(opt => <DateOpt key={opt} label={opt} onClick={() => selectDate(opt)} />)}
                  <div style={{ borderTop: '0.5px solid #f0f0f0', padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Từ ngày</div>
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDateLabel('Tùy chỉnh') }}
                      style={{ width: '100%', height: 30, border: '0.5px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none' }} />
                    <div style={{ fontSize: 11, color: '#888', margin: '6px 0 4px' }}>Đến ngày</div>
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setDateLabel('Tùy chỉnh') }}
                      style={{ width: '100%', height: 30, border: '0.5px solid #d1d5db', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none' }} />
                  </div>
                </div>
              )}
            </div>
          </SbCard>

          <SbCard title="Trạng thái">
            {['', ...STATUS_LIST].map((s, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, cursor: 'pointer', fontSize: 13, color: '#444' }}>
                <input type="radio" name="status" checked={statusFilter === s} onChange={() => setStatusFilter(s)} style={{ accentColor: '#253584' }} />
                {s === '' ? 'Tất cả' : s}
              </label>
            ))}
          </SbCard>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 340, height: 36, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', border: '0.5px solid #d1d5db' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position: 'absolute', left: 10 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm theo mã đơn, tên NPP..."
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '0 12px 0 34px', background: 'transparent', color: '#222' }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {/* Xuất file — viền xanh #66FF75 */}
              <button style={{ height: 36, background: '#fff', color: '#1a7a26', border: '1.5px solid #66FF75', borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#66FF75" strokeWidth="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Xuất file
              </button>
              {/* Đặt hàng — nền #66FF75 */}
              <button onClick={() => setShowCreate(true)}
                style={{ height: 36, background: '#66FF75', color: '#0a3d12', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a3d12" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Đặt hàng
              </button>
            </div>
          </div>

          {/* Summary row */}
          {filtered.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '8px 8px 0 0', padding: '6px 14px', display: 'flex', gap: 32, fontSize: 12, fontWeight: 700, color: '#253584', borderBottom: '0.5px solid #e5e7eb' }}>
              <span>Tổng: {fmt(filtered.reduce((s, o) => s + o.total, 0))} đ</span>
              <span style={{ color: '#888', fontWeight: 400 }}>{filtered.length} đơn</span>
            </div>
          )}

          {/* Table */}
          <div style={{ borderRadius: filtered.length > 0 ? '0 0 8px 8px' : 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            {/* Head */}
            <div style={{ ...rowGrid, background: '#E8F0FE', height: 42, fontWeight: 700, fontSize: 12, color: '#0C447C', borderBottom: '0.5px solid #c7d9f5' }}>
              <div><input type="checkbox" style={{ width: 13, height: 13, accentColor: '#253584' }} /></div>
              <div />
              <div>Mã đặt hàng</div>
              <div>Nhà phân phối</div>
              <div>Thời gian</div>
              <div style={{ textAlign: 'right' }}>Tổng tiền</div>
              <div>Trạng thái</div>
              <div style={{ textAlign: 'center' }}>Thao tác</div>
            </div>

            {slice.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', background: '#fff', fontSize: 13 }}>
                Chưa có đơn hàng nào
              </div>
            )}

            {slice.map(order => (
              <div key={order.id}
                style={{ ...rowGrid, minHeight: 50, background: '#fff', borderBottom: '0.5px solid #f0f0f0', transition: 'background 0.1s', paddingTop: 6, paddingBottom: 6 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f7ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>

                <div><input type="checkbox" style={{ width: 13, height: 13, accentColor: '#253584' }} /></div>
                <div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                </div>
                <div>
                  <span
                    onClick={() => openDetail(order.id)}
                    style={{ color: '#253584', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                  >
                    {order.id}
                  </span>
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {order.distributor_name}
                  {order.discount_pct > 0 && (
                    <span style={{ marginLeft: 6, fontSize: 10, background: '#FFF3E0', color: '#7C4D00', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                      -{order.discount_pct}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {new Date(order.ordered_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: '#111' }}>{fmt(order.total)} đ</div>

                {/* Trạng thái — nút bấm nếu chưa kết thúc */}
                <div>
                  {order.status === 'Đã huỷ' || order.status === 'Hoàn thành' ? (
                    <StatusBadge status={order.status} />
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, order.status === 'Chờ giao' ? 'Đang giao' : 'Hoàn thành')}
                      title={order.status === 'Chờ giao' ? 'Bấm → Đang giao' : 'Bấm → Hoàn thành'}
                      style={{
                        ...statusStyle[order.status],
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', whiteSpace: 'nowrap', outline: 'none',
                      }}>
                      {order.status}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  )}
                </div>

                {/* Thao tác — nút Huỷ */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {order.status !== 'Đã huỷ' && order.status !== 'Hoàn thành' && (
                    <button
                      onClick={() => setShowCancelConfirm(order.id)}
                      style={{ height: 26, background: '#fff0f0', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '0 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Huỷ
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 14px', background: '#fff', borderTop: '0.5px solid #f0f0f0', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666', marginRight: 10 }}>Tổng: {filtered.length} đơn</span>
              {pages > 1 && (<>
                <PgBtn disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</PgBtn>
                {Array.from({ length: pages }, (_, i) => <PgBtn key={i} active={i + 1 === safePage} onClick={() => setPage(i + 1)}>{i + 1}</PgBtn>)}
                <PgBtn disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>›</PgBtn>
              </>)}
            </div>
          </div>
        </main>
      </div>

      {/* CREATE ORDER MODAL */}
      {showCreate && (
        <Overlay>
          <CreateOrderForm
            distributors={distributors}
            products={products}
            role={role}
            accountId={accountId}
            isPending={isPending}
            onSubmit={handleCreateOrder}
            onClose={() => setShowCreate(false)}
          />
        </Overlay>
      )}

      {/* PIN DIALOG */}
      {showPin && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', width: 320, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2560', marginBottom: 6 }}>Xác nhận chiết khấu</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
              Chiết khấu <strong style={{ color: '#253584' }}>{pendingDiscount}%</strong> cần được xác nhận bởi quản lý. Vui lòng nhập mã PIN.
            </p>
            <input type="password" value={pinValue}
              onChange={e => { setPinValue(e.target.value); setPinError('') }}
              onKeyDown={e => e.key === 'Enter' && handlePinConfirm()}
              placeholder="Nhập mã PIN" autoFocus
              style={{ width: '100%', height: 40, border: `1.5px solid ${pinError ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, padding: '0 12px', fontSize: 16, outline: 'none', textAlign: 'center', letterSpacing: 6 }} />
            {pinError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setShowPin(false); setPinValue(''); setPinError('') }}
                style={{ flex: 1, height: 38, background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Huỷ</button>
              <button onClick={handlePinConfirm} disabled={!pinValue}
                style={{ flex: 1, height: 38, background: '#253584', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !pinValue ? 0.5 : 1 }}>
                Xác nhận
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* CANCEL CONFIRM DIALOG */}
      {showCancelConfirm && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', width: 340, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#791F1F', marginBottom: 10 }}>Xác nhận huỷ đơn</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 20, lineHeight: 1.6 }}>
              Bạn có chắc muốn huỷ đơn <strong style={{ color: '#253584' }}>{showCancelConfirm}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCancelConfirm(null)}
                style={{ flex: 1, height: 38, background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Không</button>
              <button onClick={doCancel}
                style={{ flex: 1, height: 38, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Huỷ đơn</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ORDER DETAIL MODAL */}
      {(loadingDetail || detail) && (
        <Overlay>
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
                  <span>📦 NPP: <strong style={{ color: '#253584' }}>{detail.distributor_name}</strong></span>
                  <span>🏷️ Mã NPP: <strong>{detail.distributor_id}</strong></span>
                  <span>🕐 Ngày đặt: {new Date(detail.ordered_at).toLocaleString('vi-VN')}</span>
                  {detail.delivery_date && <span>🚚 Giao dự kiến: {new Date(detail.delivery_date).toLocaleDateString('vi-VN')}</span>}
                  {detail.ordered_by && <span>👤 Người tạo: {detail.ordered_by}</span>}
                  {detail.note && <span>📝 Ghi chú: {detail.note}</span>}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Trạng thái: <StatusBadge status={detail.status} />
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, border: '1px solid #d0e4f0', borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      {['Mã hàng', 'Tên hàng', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền'].map((hd, i) => (
                        <th key={hd} style={{ background: '#CEE8FF', padding: '10px 12px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 700, fontSize: 12 }}>{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #eef2f7' }}>
                        <td style={{ padding: '9px 12px', color: '#253584', fontWeight: 600 }}>{item.product_code}</td>
                        <td style={{ padding: '9px 12px' }}>{item.product_name}</td>
                        <td style={{ padding: '9px 12px' }}>{item.unit}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600 }}>{fmt(item.quantity * item.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <table style={{ fontSize: 13, minWidth: 280 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 8px', color: '#555' }}>Tổng tiền hàng:</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(detail.subtotal ?? detail.total)} đ</td>
                      </tr>
                      {(detail.discount_pct ?? 0) > 0 && (
                        <tr>
                          <td style={{ padding: '4px 8px', color: '#7C4D00' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
                              </svg>
                              Chiết khấu {detail.discount_pct}%:
                            </span>
                          </td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600, color: '#7C4D00' }}>
                            -{fmt((detail.subtotal ?? detail.total) - detail.total)} đ
                          </td>
                        </tr>
                      )}
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
        </Overlay>
      )}
    </>
  )
}

// ── CREATE ORDER FORM ──
function CreateOrderForm({ distributors, products, role, accountId, isPending, onSubmit, onClose }: {
  distributors: Distributor[]
  products: Product[]
  role: 'admin' | 'manager' | 'staff'
  accountId: string
  isPending: boolean
  onSubmit: (data: CreateDistributorOrderInput) => void
  onClose: () => void
}) {
  const [distId, setDistId] = useState('')
  const [discPct, setDiscPct] = useState(0)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState([
    { product_code: '', product_name: '', unit: 'kg', quantity: 0, unit_price: 0 }
  ])

  type SuggestState = { idx: number; field: 'code' | 'name'; value: string } | null
  const [suggestState, setSuggestState] = useState<SuggestState>(null)
  const suggestRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setSuggestState(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const getSuggestions = (field: 'code' | 'name', value: string) => {
    if (!value) return []
    const q = value.toLowerCase()
    return products.filter(p =>
      field === 'code' ? p.id.toLowerCase().includes(q) : p.name.toLowerCase().includes(q)
    ).slice(0, 8)
  }

  const applySuggestion = (idx: number, p: Product) => {
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, product_code: p.id, product_name: p.name, unit: p.unit || 'kg', unit_price: p.sell_price }
      : it))
    setSuggestState(null)
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discAmt = Math.round(subtotal * discPct / 100)
  const total = subtotal - discAmt

  const addItem = () => setItems(p => [...p, { product_code: '', product_name: '', unit: 'kg', quantity: 0, unit_price: 0 }])
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: string, value: string | number) =>
    setItems(p => p.map((it, i) => i === idx ? { ...it, [field]: value } : it))

  const handleSubmit = () => {
    if (!distId) { alert('Vui lòng chọn nhà phân phối!'); return }
    if (items.some(i => !i.product_name || i.quantity <= 0)) { alert('Vui lòng điền đủ thông tin sản phẩm!'); return }
    onSubmit({
      distributor_id: distId,
      items: items.map(i => ({ ...i, sell_price: i.unit_price })),
      discount_pct: discPct,
      discount_confirmed_by: role === 'admin' ? accountId : null,
      discount_confirmed_at: role === 'admin' && discPct > 0 ? new Date().toISOString() : null,
      delivery_date: deliveryDate || null,
      note: note || null,
      ordered_by: accountId,
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', height: 32, border: '0.5px solid #d1d5db', borderRadius: 6,
    padding: '0 8px', fontSize: 12, outline: 'none', background: '#fafafa', color: '#222',
  }

  const activeSuggestions = suggestState ? getSuggestions(suggestState.field, suggestState.value) : []

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '20px', width: 720, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1a2560' }}>Tạo đơn đặt hàng NPP</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>✕</button>
      </div>

      {/* Thông tin đơn */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nhà phân phối *</label>
          <select value={distId} onChange={e => setDistId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">— Chọn NPP —</option>
            {distributors.map(d => <option key={d.id} value={d.id}>{d.id} — {d.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Ngày giao dự kiến</label>
          <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>
            Chiết khấu
            {role !== 'admin' && <span style={{ marginLeft: 6, fontSize: 10, color: '#888' }}>— cần PIN</span>}
          </label>
          {/* Input % có icon vector SVG */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="number" min="0" max="100" step="0.5"
              value={discPct || ''} onChange={e => setDiscPct(parseFloat(e.target.value) || 0)}
              placeholder="0"
              style={{ ...inp, paddingRight: 30, textAlign: 'right' }}
            />
            <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', color: discPct > 0 ? '#7C4D00' : '#bbb', display: 'flex', alignItems: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </span>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Ghi chú</label>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú về đơn hàng..." style={inp} />
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Danh sách sản phẩm</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 105 }} />
            <col />
            <col style={{ width: 54 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 30 }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#E8F0FE' }}>
              {['Mã hàng', 'Tên sản phẩm *', 'ĐVT', 'Số lượng', 'Đơn giá', 'Thành tiền', ''].map((h, i) => (
                <th key={i} style={{ padding: '7px 8px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#0C447C', borderBottom: '0.5px solid #c7d9f5' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isActive = suggestState?.idx === idx
              const showSuggest = isActive && activeSuggestions.length > 0

              return (
                <tr key={idx} style={{ borderBottom: '0.5px solid #f0f0f0' }}>

                  {/* Mã hàng */}
                  <td style={{ padding: '5px 5px', position: 'relative' }}>
                    <input
                      value={item.product_code}
                      onChange={e => { updateItem(idx, 'product_code', e.target.value); setSuggestState({ idx, field: 'code', value: e.target.value }) }}
                      onFocus={() => item.product_code && setSuggestState({ idx, field: 'code', value: item.product_code })}
                      placeholder="SP001..."
                      style={{ ...inp }}
                    />
                    {showSuggest && suggestState?.field === 'code' && (
                      <div ref={suggestRef} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 280, overflow: 'hidden' }}>
                        {activeSuggestions.map(p => (
                          <div key={p.code} onMouseDown={() => applySuggestion(idx, p)}
                            style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '0.5px solid #f5f5f5', display: 'flex', gap: 8, alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <span style={{ fontWeight: 700, color: '#253584', minWidth: 52 }}>{p.code}</span>
                            <span style={{ color: '#444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            <span style={{ color: '#aaa', fontSize: 11 }}>{p.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Tên sản phẩm */}
                  <td style={{ padding: '5px 5px', position: 'relative' }}>
                    <input
                      value={item.product_name}
                      onChange={e => { updateItem(idx, 'product_name', e.target.value); setSuggestState({ idx, field: 'name', value: e.target.value }) }}
                      onFocus={() => item.product_name && setSuggestState({ idx, field: 'name', value: item.product_name })}
                      placeholder="Tên sản phẩm"
                      style={{ ...inp }}
                    />
                    {showSuggest && suggestState?.field === 'name' && (
                      <div ref={suggestRef} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: 300, overflow: 'hidden' }}>
                        {activeSuggestions.map(p => (
                          <div key={p.code} onMouseDown={() => applySuggestion(idx, p)}
                            style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '0.5px solid #f5f5f5', display: 'flex', gap: 8, alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}>
                            <span style={{ fontWeight: 700, color: '#253584', minWidth: 52 }}>{p.code}</span>
                            <span style={{ color: '#444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                            <span style={{ color: '#aaa', fontSize: 11 }}>{p.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '5px 5px' }}><input value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} style={{ ...inp, textAlign: 'center' }} /></td>
                  <td style={{ padding: '5px 5px' }}><input type="number" min="0" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} style={{ ...inp, textAlign: 'right' }} /></td>
                  <td style={{ padding: '5px 5px' }}><input type="number" min="0" value={item.unit_price || ''} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} style={{ ...inp, textAlign: 'right' }} /></td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, color: '#253584', whiteSpace: 'nowrap' }}>{fmt(item.quantity * item.unit_price)}</td>
                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} style={{ background: 'none', border: '0.5px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '2px 6px', fontSize: 11 }}>✕</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <button onClick={addItem} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#253584', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Thêm sản phẩm
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '0.5px solid #f0f0f0', paddingTop: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 13, minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#555' }}>
            <span>Tổng tiền hàng:</span><span style={{ fontWeight: 600 }}>{fmt(subtotal)} đ</span>
          </div>
          {discPct > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 10px', background: '#FFF8F0', borderRadius: 6, margin: '4px 0', color: '#7C4D00' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C4D00" strokeWidth="2.2">
                  <line x1="19" y1="5" x2="5" y2="19" />
                  <circle cx="6.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
                Chiết khấu {discPct}%:
              </span>
              <span style={{ fontWeight: 700 }}>-{fmt(discAmt)} đ</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', fontWeight: 700, fontSize: 14, color: '#253584', borderTop: '0.5px solid #e5e7eb', marginTop: 6 }}>
            <span>Cần thanh toán:</span><span>{fmt(total)} đ</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 38, background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Huỷ</button>
        <button onClick={handleSubmit} disabled={isPending}
          style={{ flex: 2, height: 38, background: '#253584', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {isPending ? 'Đang lưu...' : role !== 'admin' && discPct > 0 ? '🔒 Lưu (cần PIN)' : 'Lưu đơn hàng'}
        </button>
      </div>
    </div>
  )
}

// ── HELPERS ──
function SbCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, border: '0.5px solid #e5e7eb', padding: '12px 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#222', marginBottom: 8 }}>{title}</div>
      <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: '0 0 6px' }} />
      {children}
    </div>
  )
}
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  )
}
function DateOpt({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#333' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{label}</div>
  )
}
function PgBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ minWidth: 26, height: 26, border: '0.5px solid #e5e7eb', background: active ? '#253584' : '#fff', color: active ? '#fff' : '#333', borderColor: active ? '#253584' : '#e5e7eb', borderRadius: 4, fontSize: 12, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, padding: '0 5px' }}>
      {children}
    </button>
  )
}