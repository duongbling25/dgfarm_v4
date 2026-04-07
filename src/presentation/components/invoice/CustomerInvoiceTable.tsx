'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getInvoiceWithItemsUseCase } from '@/application/use-cases/order/GetCustomerInvoicesUseCase'
import type { Invoice } from '@/application/use-cases/order/GetCustomerInvoicesUseCase'
import type { OrderWithItems } from '@/domain/entities/Customer'
import { Overlay, PgBtn, SbCard } from '@/presentation/components/ui/SharedUI'

const fmt = (n: number) => n.toLocaleString('vi-VN')

type WfStatus = 'Hoàn thành' | 'Đã hủy' | 'Từ chối'
type StatusFilter = 'Tất cả' | WfStatus

const STATUS_STYLES: Record<WfStatus, React.CSSProperties> = {
  'Hoàn thành': { background: '#EAF3DE', color: '#27500A', border: '1px solid #b7d88a' },
  'Đã hủy':     { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' },
  'Từ chối':    { background: '#FCEBEB', color: '#791F1F', border: '1px solid #f8b4b4' },
}

const STATUS_ICON: Record<WfStatus, string> = {
  'Hoàn thành': '✓',
  'Đã hủy':     '✕',
  'Từ chối':    '⊘',
}

function StatusBadge({ status }: { status: WfStatus }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', ...STATUS_STYLES[status],
    }}>
      <svg width="8" height="8" viewBox="0 0 8 8">
        {status === 'Hoàn thành'
          ? <polyline points="1,4 3,6.5 7,1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          : <><line x1="1.5" y1="1.5" x2="6.5" y2="6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>
        }
      </svg>
      {status}
    </span>
  )
}

const DATE_OPTS = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Tháng trước']

function getDateRange(opt: string): { from: string; to: string } {
  const now = new Date()
  const f = (d: Date) => d.toISOString().split('T')[0]
  if (opt === 'Hôm nay')    { const s = f(now); return { from: s, to: s } }
  if (opt === 'Hôm qua')    { const d = new Date(now); d.setDate(d.getDate()-1); const s = f(d); return { from: s, to: s } }
  if (opt === 'Tuần này')   { const d = new Date(now); d.setDate(d.getDate()-d.getDay()+1); const e = new Date(d); e.setDate(e.getDate()+6); return { from: f(d), to: f(e) } }
  if (opt === 'Tuần trước') { const d = new Date(now); d.setDate(d.getDate()-d.getDay()-6); const e = new Date(d); e.setDate(e.getDate()+6); return { from: f(d), to: f(e) } }
  if (opt === 'Tháng này')  return { from: f(new Date(now.getFullYear(), now.getMonth(), 1)),   to: f(new Date(now.getFullYear(), now.getMonth()+1, 0)) }
  if (opt === 'Tháng trước')return { from: f(new Date(now.getFullYear(), now.getMonth()-1, 1)), to: f(new Date(now.getFullYear(), now.getMonth(), 0)) }
  return { from: '', to: '' }
}

function DateDropdown({ refEl, label, from, to, show, setShow, setFrom, setTo, setLabel }: {
  refEl: React.RefObject<HTMLDivElement>
  label: string; from: string; to: string; show: boolean
  setShow: (v: boolean) => void; setFrom: (v: string) => void
  setTo: (v: string) => void; setLabel: (v: string) => void
}) {
  return (
    <div ref={refEl} style={{ position: 'relative', marginTop: 6 }}>
      <div onClick={() => setShow(!show)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', border: '1.5px solid #d0d7e2', borderRadius: 20, cursor: 'pointer', background: '#f7f9fc', fontSize: 13 }}>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
      {show && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', marginTop: 4 }}>
          <div onClick={() => { setFrom(''); setTo(''); setLabel('Toàn thời gian'); setShow(false) }}
            style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Toàn thời gian
          </div>
          {DATE_OPTS.map(opt => (
            <div key={opt}
              onClick={() => { const r = getDateRange(opt); setFrom(r.from); setTo(r.to); setLabel(opt); setShow(false) }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {opt}
            </div>
          ))}
          <div style={{ borderTop: '1px solid #eee', padding: '8px 14px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Từ ngày</div>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setLabel('Lựa chọn khác') }}
              style={{ width: '100%', height: 32, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none' }} />
            <div style={{ fontSize: 12, color: '#888', margin: '6px 0 4px' }}>Đến ngày</div>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setLabel('Lựa chọn khác') }}
              style={{ width: '100%', height: 32, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      )}
    </div>
  )
}

const rowGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '40px 140px 1fr 1fr 100px 150px 110px',
  padding: '0 16px',
  gap: '0 12px',
  alignItems: 'center',
  fontSize: 13,
  color: '#000',
}

const STATUS_OPTIONS: StatusFilter[] = ['Tất cả', 'Hoàn thành', 'Đã hủy', 'Từ chối']

export default function CustomerInvoiceTable({ initialInvoices, onDeleteMany }: { initialInvoices: Invoice[], onDeleteMany: (ids: string[]) => Promise<void> }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tất cả')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [dateLabel, setDateLabel]   = useState('Toàn thời gian')
  const [showDateDrop, setShowDateDrop] = useState(false)
  const [minAmt, setMinAmt]         = useState('')
  const [maxAmt, setMaxAmt]         = useState('')
  const [page, setPage]             = useState(1)
  const PER = 15

  const [invoice, setInvoice]             = useState<OrderWithItems | null>(null)
  const [loadingInvoice, setLoadingInvoice] = useState(false)

  const dateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = initialInvoices.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.id.toLowerCase().includes(q)
          && !o.customer_id.toLowerCase().includes(q)
          && !o.customer_name.toLowerCase().includes(q)
          && !(o.seller || '').toLowerCase().includes(q)) return false
    if (statusFilter !== 'Tất cả' && o.workflow_status !== statusFilter) return false
    if (dateFrom && o.ordered_at.slice(0,10) < dateFrom) return false
    if (dateTo   && o.ordered_at.slice(0,10) > dateTo)   return false
    if (minAmt && o.total < Number(minAmt)) return false
    if (maxAmt && o.total > Number(maxAmt)) return false
    return true
  })

  const pages    = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice    = filtered.slice((safePage-1)*PER, safePage*PER)

  const countByStatus = (s: WfStatus) => initialInvoices.filter(o => o.workflow_status === s).length
  const totalRevenue  = filtered
    .filter(o => o.workflow_status === 'Hoàn thành')
    .reduce((s, o) => s + o.total, 0)

  const openInvoice = async (orderId: string) => {
    setLoadingInvoice(true)
    setInvoice(null)
    const data = await getInvoiceWithItemsUseCase(orderId)
    setInvoice(data)
    setLoadingInvoice(false)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === slice.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(slice.map(o => o.id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDeleteMany(selectedIds)
      setSelectedIds([])
      setShowDeleteConfirm(false)
    } catch (e) {
      alert('Lỗi khi xóa hóa đơn')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', background: '#E5E5E5', paddingLeft: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#000' }}>Hóa đơn khách hàng</span>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 138px)' }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 260, minWidth: 260, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          <SbCard title="Trạng thái">
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {STATUS_OPTIONS.map(s => {
                const active = statusFilter === s
                return (
                  <div key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                      background: active ? '#eef2ff' : 'transparent',
                      fontWeight: active ? 700 : 400,
                      color: active ? '#253584' : '#333',
                      border: active ? '1px solid #c7d2fe' : '1px solid transparent',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f5f7ff' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s !== 'Tất cả' && (
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: s === 'Hoàn thành' ? '#4ade80' : '#f87171',
                        }} />
                      )}
                      {s}
                    </div>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                      {s === 'Tất cả' ? initialInvoices.length : countByStatus(s as WfStatus)}
                    </span>
                  </div>
                )
              })}
            </div>
          </SbCard>

          <SbCard title="Thời gian">
            <DateDropdown refEl={dateRef} label={dateLabel} from={dateFrom} to={dateTo}
              show={showDateDrop} setShow={setShowDateDrop}
              setFrom={setDateFrom} setTo={setDateTo} setLabel={setDateLabel} />
          </SbCard>

          <SbCard title="Giá trị hóa đơn">
            {([['Từ:', minAmt, setMinAmt], ['Đến:', maxAmt, setMaxAmt]] as const).map(([label, val, setter]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{ fontSize: 12, color: '#555', width: 28 }}>{label}</span>
                <input type="number" value={val} onChange={e => { setter(e.target.value); setPage(1) }}
                  style={{ flex: 1, height: 28, border: '1px solid #ccc', borderRadius: 4, fontSize: 12, padding: '0 7px', outline: 'none', textAlign: 'right' }}
                  placeholder={label === 'Đến:' ? 'Tất cả' : '0'} />
              </div>
            ))}
          </SbCard>

          <SbCard title="Tổng kết">
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#555' }}>Đang hiển thị:</span>
                <span style={{ fontWeight: 700 }}>{filtered.length} hóa đơn</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#555' }}>Doanh thu:</span>
                <span style={{ fontWeight: 700, color: '#253584' }}>{fmt(totalRevenue)}</span>
              </div>
            </div>
          </SbCard>

        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 420, position: 'relative', height: 38, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm theo mã HĐ, mã KH, tên KH, người bán..."
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '0 40px 0 14px', background: 'transparent' }} />
              <span style={{ position: 'absolute', right: 12, color: '#797979', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  height: 38, padding: '0 18px', background: '#fee2e2', color: '#b91c1c',
                  border: '1px solid #fca5a5', borderRadius: 6, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                </svg>
                Xóa {selectedIds.length} mục đã chọn
              </button>
            )}
          </div>

          <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            {/* Header row */}
            <div style={{ ...rowGrid, background: '#CEE8FF', height: 44, fontWeight: 700, borderBottom: '1px solid #b8d8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="checkbox"
                  checked={slice.length > 0 && selectedIds.length === slice.length}
                  onChange={toggleSelectAll}
                  style={{ width: 15, height: 15, cursor: 'pointer' }}
                />
              </div>
              <div>Mã hóa đơn</div>
              <div>Khách hàng</div>
              <div>Người bán</div>
              <div style={{ textAlign: 'center' }}>Tổng cộng</div>
              <div>Trạng thái</div>
              <div>Thời gian</div>
            </div>

            {slice.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', background: '#fff' }}>
                Không có hóa đơn nào
              </div>
            ) : slice.map((o, idx) => (
              <div key={o.id}
                style={{ ...rowGrid, height: 46, background: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa')}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox"
                    checked={selectedIds.includes(o.id)}
                    onChange={() => toggleSelectOne(o.id)}
                    style={{ width: 15, height: 15, cursor: 'pointer' }}
                  />
                </div>
                {/* Mã HĐ — mở modal */}
                <div>
                  <span onClick={() => openInvoice(o.id)}
                    style={{ color: '#253584', fontWeight: 700, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                    {o.id}
                  </span>
                </div>

                {/* Tên KH — link sang /khach-hang */}
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Link href={`/khach-hang`}
                    title={`Xem hồ sơ ${o.customer_name}`}
                    style={{ color: '#444', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#253584'; (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}>
                    {o.customer_name}
                  </Link>
                </div>

                <div style={{ color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.seller}</div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(o.total)}</div>
                <div><StatusBadge status={o.workflow_status} /></div>
                <div style={{ color: '#666', fontSize: 12 }}>{new Date(o.ordered_at).toLocaleDateString('vi-VN')}</div>
              </div>
            ))}

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px', background: '#fff', borderTop: '1px solid #eee', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666', marginRight: 10 }}>Tổng: {filtered.length} hóa đơn</span>
              {pages > 1 && (<>
                <PgBtn disabled={safePage === 1} onClick={() => setPage(safePage-1)}>‹</PgBtn>
                {Array.from({ length: pages }, (_, i) => <PgBtn key={i} active={i+1 === safePage} onClick={() => setPage(i+1)}>{i+1}</PgBtn>)}
                <PgBtn disabled={safePage === pages} onClick={() => setPage(safePage+1)}>›</PgBtn>
              </>)}
            </div>
          </div>
        </main>
      </div>

      {/* ── Invoice detail modal ── */}
      {(loadingInvoice || invoice) && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px 20px', width: 700, maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0E176E' }}>
                {loadingInvoice ? 'Đang tải...' : `Hóa đơn ${invoice?.id}`}
              </span>
              <button onClick={() => setInvoice(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {invoice && !loadingInvoice && (
              <>
                <div style={{ fontSize: 12, color: '#555', marginBottom: 14, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>🕐 {new Date(invoice.ordered_at).toLocaleString('vi-VN')}</span>
                  <span>👤 Người bán: {invoice.seller}</span>
                  <StatusBadge status={invoice.workflow_status as WfStatus} />
                </div>

                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, border: '1px solid #d0e4f0', borderRadius: 8, overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      {['Mã hàng', 'Tên hàng', 'Số lượng', 'Đơn giá', 'Giảm giá', 'Giá bán', 'Thành tiền'].map((hd, i) => (
                        <th key={hd} style={{ background: '#CEE8FF', padding: '10px 12px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 700 }}>{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.order_items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid #eef2f7' }}>
                        <td style={{ padding: '9px 12px', color: '#253584', fontWeight: 600 }}>{item.product_code}</td>
                        <td style={{ padding: '9px 12px' }}>{item.product_name}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{item.discount > 0 ? fmt(item.discount) : '-'}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.sell_price)}</td>
                        <td style={{ padding: '9px 12px', textAlign: 'right' }}>{fmt(item.quantity * item.sell_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <InvoiceSummary items={invoice.order_items} />
              </>
            )}
          </div>
        </Overlay>
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 12, padding: '28px 24px', width: 360, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#b91c1c', marginBottom: 12 }}>Xác nhận xóa</div>
            <p style={{ fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> hóa đơn đã chọn? Hành động này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                style={{ flex: 1, height: 38, background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{ flex: 1, height: 38, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa ngay'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  )
}

function InvoiceSummary({ items }: { items: { quantity: number; sell_price: number; discount: number; unit_price: number }[] }) {
  const totalQty      = items.reduce((s, i) => s + i.quantity, 0)
  const totalAmt      = items.reduce((s, i) => s + i.quantity * i.sell_price, 0)
  const totalDiscount = items.reduce((s, i) => s + i.quantity * i.discount, 0)
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
      <table style={{ fontSize: 13, minWidth: 260 }}>
        <tbody>
          <tr><td style={{ padding: '4px 8px', color: '#333' }}>Tổng số lượng:</td><td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{totalQty}</td></tr>
          <tr><td style={{ padding: '4px 8px', color: '#333' }}>Tổng tiền hàng:</td><td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(totalAmt + totalDiscount)}</td></tr>
          <tr><td style={{ padding: '4px 8px', color: '#333' }}>Giảm giá:</td><td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{totalDiscount > 0 ? fmt(totalDiscount) : '-'}</td></tr>
          <tr style={{ borderTop: '1px solid #ddd' }}>
            <td style={{ padding: '8px 8px 4px', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>Khách cần trả:</td>
            <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>{fmt(totalAmt)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}