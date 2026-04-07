'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getDistributorInvoiceWithItemsUseCase } from '@/application/use-cases/order/GetDistributorInvoicesUseCase'
import type { DistributorInvoice } from '@/application/use-cases/order/GetDistributorInvoicesUseCase'
import type { DistributorOrderWithItems } from '@/domain/entities/DistributorOrder'
import { Overlay, PgBtn, SbCard } from '@/presentation/components/ui/SharedUI'

const fmt = (n: number) => n.toLocaleString('vi-VN')

type InvoiceStatus = 'Hoàn thành' | 'Đã huỷ'
type StatusFilter  = 'Tất cả' | InvoiceStatus

const STATUS_CFG: Record<InvoiceStatus, { bg: string; color: string; border: string; dot: string }> = {
  'Hoàn thành': { bg: '#EAF3DE', color: '#27500A', border: '#b7d88a', dot: '#4ade80' },
  'Đã huỷ':    { bg: '#FCEBEB', color: '#791F1F', border: '#f8b4b4', dot: '#f87171' },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const c = STATUS_CFG[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <svg width="8" height="8" viewBox="0 0 8 8" style={{ flexShrink: 0 }}>
        {status === 'Hoàn thành'
          ? <polyline points="1,4 3,6.5 7,1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          : <><line x1="1.5" y1="1.5" x2="6.5" y2="6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="6.5" y1="1.5" x2="1.5" y2="6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>
        }
      </svg>
      {status}
    </span>
  )
}

const DATE_OPTS = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tuần trước', 'Tháng này', 'Tháng trước']

function getDateRange(opt: string) {
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
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
            <div key={opt} onClick={() => { const r = getDateRange(opt); setFrom(r.from); setTo(r.to); setLabel(opt); setShow(false) }}
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

const ROW_COLS = '40px 160px 90px minmax(140px,1fr) 80px 130px 120px 100px'

const rowGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: ROW_COLS,
  padding: '0 16px',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
}

const STATUS_OPTIONS: StatusFilter[] = ['Tất cả', 'Hoàn thành', 'Đã huỷ']

export default function DistributorInvoiceTable({ initialInvoices }: { initialInvoices: DistributorInvoice[] }) {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Tất cả')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [dateLabel, setDateLabel]       = useState('Toàn thời gian')
  const [showDateDrop, setShowDateDrop] = useState(false)
  const [minAmt, setMinAmt]             = useState('')
  const [maxAmt, setMaxAmt]             = useState('')
  const [page, setPage]                 = useState(1)
  const PER = 15

  const [detail, setDetail]               = useState<DistributorOrderWithItems | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [selected, setSelected]           = useState<Set<string>>(new Set())

  const dateRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setShowDateDrop(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Tính filtered trước, rồi mới dùng ──────────────────────────
  const filtered = initialInvoices.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.id.toLowerCase().includes(q)
          && !o.distributor_id.toLowerCase().includes(q)
          && !o.distributor_name.toLowerCase().includes(q)
          && !(o.ordered_by ?? '').toLowerCase().includes(q)) return false
    if (statusFilter !== 'Tất cả' && o.status !== statusFilter) return false
    if (dateFrom && o.ordered_at.slice(0, 10) < dateFrom) return false
    if (dateTo   && o.ordered_at.slice(0, 10) > dateTo)   return false
    if (minAmt && o.total < Number(minAmt)) return false
    if (maxAmt && o.total > Number(maxAmt)) return false
    return true
  })

  const pages    = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice    = filtered.slice((safePage - 1) * PER, safePage * PER)

  // ── Checkbox helpers (dùng slice đã có) ────────────────────────
  const toggleOne = (id: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const allOnPage   = slice.map(o => o.id)
  const allChecked  = allOnPage.length > 0 && allOnPage.every(id => selected.has(id))
  const someChecked = allOnPage.some(id => selected.has(id))

  const toggleAll = () => {
    setSelected(prev => {
      const s = new Set(prev)
      if (allChecked) allOnPage.forEach(id => s.delete(id))
      else            allOnPage.forEach(id => s.add(id))
      return s
    })
  }

  const handleDeleteSelected = () => {
    if (selected.size === 0) return
    if (!confirm(`Xóa ${selected.size} hóa đơn đã chọn?`)) return
    console.log('Xóa các hóa đơn NPP:', [...selected])
    setSelected(new Set())
  }

  const countOf = (s: InvoiceStatus) => initialInvoices.filter(o => o.status === s).length
  const revenue = filtered.filter(o => o.status === 'Hoàn thành').reduce((s, o) => s + o.total, 0)

  const openDetail = async (id: string) => {
    setLoadingDetail(true)
    setDetail(null)
    const data = await getDistributorInvoiceWithItemsUseCase(id)
    setDetail(data)
    setLoadingDetail(false)
  }

  return (
    <>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', background: '#E5E5E5', paddingLeft: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#000' }}>Hóa đơn nhà phân phối</span>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 138px)' }}>

        {/* Sidebar */}
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
                        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: STATUS_CFG[s as InvoiceStatus].dot }} />
                      )}
                      {s}
                    </div>
                    <span style={{ fontSize: 11, color: '#888', fontWeight: 500 }}>
                      {s === 'Tất cả' ? initialInvoices.length : countOf(s as InvoiceStatus)}
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
            {([['Từ:', minAmt, setMinAmt], ['Đến:', maxAmt, setMaxAmt]] as const).map(([lbl, val, setter]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{ fontSize: 12, color: '#555', width: 28 }}>{lbl}</span>
                <input type="number" value={val} onChange={e => { setter(e.target.value); setPage(1) }}
                  style={{ flex: 1, height: 28, border: '1px solid #ccc', borderRadius: 4, fontSize: 12, padding: '0 7px', outline: 'none', textAlign: 'right' }}
                  placeholder={lbl === 'Đến:' ? 'Tất cả' : '0'} />
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
                <span style={{ fontWeight: 700, color: '#253584' }}>{fmt(revenue)}</span>
              </div>
            </div>
          </SbCard>

        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>

          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 440, position: 'relative', height: 38, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Tìm theo mã HĐ, mã NPP, tên NPP..."
                style={{ width: '100%', height: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '0 40px 0 14px', background: 'transparent' }} />
              <span style={{ position: 'absolute', right: 12, color: '#797979', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
            </div>
            {selected.size > 0 && (
              <button onClick={handleDeleteSelected}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
                Xóa ({selected.size})
              </button>
            )}
          </div>

          <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>

            {/* Header */}
            <div style={{ ...rowGrid, background: '#CEE8FF', height: 44, fontWeight: 700, borderBottom: '1px solid #b8d8f0', fontSize: 12, color: '#0C447C' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input type="checkbox" checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                  onChange={toggleAll} style={{ width: 15, height: 15, cursor: 'pointer' }} />
              </div>
              <div>Mã hóa đơn</div>
              <div>Mã NPP</div>
              <div>Tên nhà phân phối</div>
              <div style={{ textAlign: 'center' }}>Chiết khấu</div>
              <div style={{ textAlign: 'right' }}>Tổng tiền</div>
              <div>Trạng thái</div>
              <div>Ngày đặt</div>
            </div>

            {slice.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#aaa', background: '#fff' }}>
                Không có hóa đơn nào
              </div>
            ) : slice.map((o, idx) => (
              <div key={o.id}
                style={{ ...rowGrid, minHeight: 46, background: selected.has(o.id) ? '#eef2ff' : idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f0f0', transition: 'background 0.1s' }}
                onMouseEnter={e => { if (!selected.has(o.id)) e.currentTarget.style.background = '#f0f5ff' }}
                onMouseLeave={e => { if (!selected.has(o.id)) e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)}
                    style={{ width: 15, height: 15, cursor: 'pointer' }} />
                </div>

                <div>
                  <span onClick={() => openDetail(o.id)}
                    style={{ color: '#253584', fontWeight: 700, cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                    {o.id}
                  </span>
                </div>

                <div>
                  <Link href="/nha-phan-phoi" title={`Xem hồ sơ ${o.distributor_name}`}
                    style={{ color: '#253584', fontWeight: 600, fontSize: 12, textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}>
                    {o.distributor_id}
                  </Link>
                </div>

                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Link href="/nha-phan-phoi"
                    style={{ color: '#444', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#253584'; (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}>
                    {o.distributor_name}
                  </Link>
                </div>

                <div style={{ textAlign: 'center' }}>
                  {o.discount_pct > 0
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FFF3E0', color: '#7C4D00', border: '1px solid #FBBF24' }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
                        </svg>
                        {o.discount_pct}%
                      </span>
                    : <span style={{ color: '#ccc', fontSize: 12 }}>—</span>
                  }
                </div>

                <div style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(o.total)}</div>
                <div><StatusBadge status={o.status} /></div>
                <div style={{ color: '#666', fontSize: 12 }}>{new Date(o.ordered_at).toLocaleDateString('vi-VN')}</div>
              </div>
            ))}

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px', background: '#fff', borderTop: '1px solid #eee', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#666', marginRight: 10 }}>Tổng: {filtered.length} hóa đơn</span>
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

      {/* Detail modal */}
      {(loadingDetail || detail) && (
        <Overlay>
          <div style={{ background: '#fff', borderRadius: 12, padding: '24px 28px 20px', width: 760, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#0E176E' }}>
                {loadingDetail ? 'Đang tải...' : `Hóa đơn ${detail?.id}`}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Trạng thái: <StatusBadge status={detail.status as InvoiceStatus} />
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
                        <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(detail.subtotal ?? detail.total)}</td>
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
                            -{fmt((detail.subtotal ?? detail.total) - detail.total)}
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderTop: '1px solid #ddd' }}>
                        <td style={{ padding: '8px 8px 4px', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>Tổng thanh toán:</td>
                        <td style={{ padding: '8px 8px 4px', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0E176E' }}>{fmt(detail.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </Overlay>
      )}
    </>
  )
}