'use client'
// src/presentation/components/order/CreateOrderModal.tsx

import React, { useState, useEffect, useRef } from 'react'
import { Overlay } from '@/presentation/components/ui/SharedUI'
import { createOrderUseCase } from '@/application/use-cases/order/CreateOrderUseCase'

const fmt = (n: number) => n.toLocaleString('vi-VN')

interface Customer { id: string; name: string; phone: string | null }
interface Product  { id: string; name: string; sell_price: number; stock: number; image_url: string | null; group: string; unit: string | null }
interface CartLine  { product: Product; quantity: number; discount: number }

interface Props {
  accountId: string
  onClose:   () => void
  onCreated: (orderId: string) => void
}

export default function CreateOrderModal({ accountId, onClose, onCreated }: Props) {
  const [customers,    setCustomers]    = useState<Customer[]>([])
  const [products,     setProducts]     = useState<Product[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [dataError,    setDataError]    = useState<string | null>(null)

  const [step,         setStep]         = useState<'customer' | 'products'>('customer')
  const [custSearch,   setCustSearch]   = useState('')
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null)
  const [prodSearch,   setProdSearch]   = useState('')
  const [cart,         setCart]         = useState<CartLine[]>([])
  const [note,         setNote]         = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const prodRef = useRef<HTMLInputElement>(null)

  // Load data từ Supabase qua API route
  useEffect(() => {
    fetch('/api/order-form-data')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setCustomers(data.customers ?? [])
        setProducts(data.products ?? [])
      })
      .catch(e => setDataError(e.message))
      .finally(() => setLoadingData(false))
  }, [])

  useEffect(() => {
    if (step === 'products') setTimeout(() => prodRef.current?.focus(), 80)
  }, [step])

  // ── Cart helpers ──────────────────────────────────────────────
  const addToCart = (p: Product) =>
    setCart(prev => {
      const i = prev.findIndex(l => l.product.id === p.id)
      if (i >= 0) return prev.map((l, idx) => idx === i ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { product: p, quantity: 1, discount: 0 }]
    })

  const setQty = (id: string, q: number) =>
    setCart(prev => prev.map(l => l.product.id === id ? { ...l, quantity: Math.max(1, q) } : l))

  const setDiscount = (id: string, d: number) =>
    setCart(prev => prev.map(l => l.product.id === id ? { ...l, discount: Math.min(100, Math.max(0, d)) } : l))

  const remove = (id: string) => setCart(prev => prev.filter(l => l.product.id !== id))

  const lineTotal  = (l: CartLine) => Math.round(l.product.sell_price * (1 - l.discount / 100)) * l.quantity
  const grandTotal = cart.reduce((s, l) => s + lineTotal(l), 0)

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCust || cart.length === 0) return
    setError(null); setSubmitting(true)
    try {
      const orderId = await createOrderUseCase({
        customerId:   selectedCust.id,
        customerName: selectedCust.name,
        note,
        items: cart.map(l => ({
          productId:   l.product.id,    // FK → products.id
          productCode: l.product.id,
          productName: l.product.name,
          quantity:    l.quantity,
          unitPrice:   l.product.sell_price,
          discount:    l.discount,
        })),
      })
      onCreated(orderId)
    } catch (e: any) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  // ── Filter ────────────────────────────────────────────────────
  const filteredCusts = customers.filter(c => {
    const q = custSearch.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
  })
  const filteredProds = products.filter(p => {
    const q = prodSearch.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
  })

  // ── UI ────────────────────────────────────────────────────────
  return (
    <Overlay>
      <div style={{
        background: '#fff', borderRadius: 12, width: 880, maxWidth: '96vw',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 48px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0E176E' }}>Tạo đơn hàng mới</span>
            {/* Steps */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {(['customer', 'products'] as const).map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <div style={{ width: 18, height: 1, background: '#d1d5db' }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: step === s ? '#0E176E' : (s === 'customer' && step === 'products') ? '#16a34a' : '#e5e7eb',
                      color: (step === s || (s === 'customer' && step === 'products')) ? '#fff' : '#9ca3af',
                    }}>
                      {s === 'customer' && step === 'products' ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: step === s ? 600 : 400, color: step === s ? '#0E176E' : '#9ca3af' }}>
                      {s === 'customer' ? 'Khách hàng' : 'Sản phẩm'}
                    </span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 13 }}>Đang tải dữ liệu...</div>
          ) : dataError ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#dc2626', fontSize: 13 }}>⚠ {dataError}</div>
          ) : step === 'customer' ? (
            <StepCustomer customers={filteredCusts} search={custSearch} onSearch={setCustSearch}
              selected={selectedCust} onSelect={setSelectedCust} />
          ) : (
            <StepProducts
              prodRef={prodRef} products={filteredProds} search={prodSearch} onSearch={setProdSearch}
              cart={cart} onAdd={addToCart} onSetQty={setQty} onSetDiscount={setDiscount}
              onRemove={remove} lineTotal={lineTotal} grandTotal={grandTotal}
              note={note} onNote={setNote} customer={selectedCust!}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#dc2626' }}>{error ? `⚠ ${error}` : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step === 'products' && (
              <button onClick={() => setStep('customer')}
                style={{ height: 36, padding: '0 16px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                ← Quay lại
              </button>
            )}
            {step === 'customer' ? (
              <button disabled={!selectedCust} onClick={() => setStep('products')}
                style={{ height: 36, padding: '0 20px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: selectedCust ? 'pointer' : 'not-allowed', background: selectedCust ? '#0E176E' : '#e5e7eb', color: selectedCust ? '#fff' : '#9ca3af' }}>
                Tiếp theo →
              </button>
            ) : (
              <button disabled={submitting || cart.length === 0} onClick={handleSubmit}
                style={{ height: 36, padding: '0 20px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: cart.length > 0 ? 'pointer' : 'not-allowed', background: cart.length > 0 ? '#006E1C' : '#e5e7eb', color: cart.length > 0 ? '#fff' : '#9ca3af' }}>
                {submitting ? 'Đang lưu...' : `Tạo đơn${grandTotal > 0 ? ' — ' + fmt(grandTotal) + ' ₫' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  )
}

// ── Step 1: Chọn khách hàng ──────────────────────────────────────
function StepCustomer({ customers, search, onSearch, selected, onSelect }: {
  customers: Customer[]; search: string; onSearch: (v: string) => void
  selected: Customer | null; onSelect: (c: Customer) => void
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Chọn khách hàng cho đơn hàng này</p>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input autoFocus value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Tìm theo mã, tên, số điện thoại..."
          style={{ width: '100%', height: 38, border: '1px solid #d1d5db', borderRadius: 8, paddingLeft: 34, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 400, overflowY: 'auto' }}>
        {customers.length === 0
          ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Không tìm thấy khách hàng</div>
          : customers.map(c => {
            const active = selected?.id === c.id
            return (
              <div key={c.id} onClick={() => onSelect(c)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${active ? '#0E176E' : '#e5e7eb'}`, background: active ? '#eef2ff' : '#fff', cursor: 'pointer', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = '#fff' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0E176E', flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.id}{c.phone ? ` · ${c.phone}` : ''}</div>
                </div>
                {active && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0E176E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ── Step 2: Chọn sản phẩm + giỏ ─────────────────────────────────
function StepProducts({ prodRef, products, search, onSearch, cart, onAdd, onSetQty, onSetDiscount, onRemove, lineTotal, grandTotal, note, onNote, customer }: {
  prodRef: React.RefObject<HTMLInputElement>
  products: Product[]; search: string; onSearch: (v: string) => void
  cart: CartLine[]
  onAdd: (p: Product) => void
  onSetQty: (id: string, q: number) => void
  onSetDiscount: (id: string, d: number) => void
  onRemove: (id: string) => void
  lineTotal: (l: CartLine) => number
  grandTotal: number; note: string; onNote: (v: string) => void
  customer: Customer
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: 16, minHeight: 440 }}>

      {/* Trái: danh sách sản phẩm */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          Khách hàng: <strong style={{ color: '#0E176E' }}>{customer.name}</strong>
          {customer.phone && <span> · {customer.phone}</span>}
        </div>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input ref={prodRef} value={search} onChange={e => onSearch(e.target.value)}
            placeholder="Tìm sản phẩm theo mã, tên..."
            style={{ width: '100%', height: 36, border: '1px solid #d1d5db', borderRadius: 8, paddingLeft: 32, paddingRight: 12, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {products.length === 0
            ? <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 13 }}>Không tìm thấy sản phẩm</div>
            : products.map(p => {
              const inCart = cart.some(l => l.product.id === p.id)
              return (
                <div key={p.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, border: `1px solid ${inCart ? '#bbf7d0' : '#f3f4f6'}`, background: inCart ? '#f0fdf4' : '#fff', transition: 'all 0.1s' }}
                  onMouseEnter={e => { if (!inCart) e.currentTarget.style.background = '#f9fafb' }}
                  onMouseLeave={e => { if (!inCart) e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 6, flexShrink: 0, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    {p.image_url
                      ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🌿'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.id} · Tồn: {p.stock}{p.unit ? ` ${p.unit}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#006E1C' }}>{fmt(p.sell_price)} ₫</div>
                    <button onClick={() => onAdd(p)}
                      style={{ marginTop: 2, height: 22, padding: '0 8px', border: 'none', borderRadius: 4, background: inCart ? '#dcfce7' : '#0E176E', color: inCart ? '#166534' : '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                      {inCart ? '✓ Đã thêm' : '+ Thêm'}
                    </button>
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Phải: giỏ hàng */}
      <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Giỏ hàng ({cart.length})</div>
        {cart.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
            Chưa chọn sản phẩm nào
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cart.map(l => (
              <div key={l.product.id} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#111', flex: 1, paddingRight: 4, lineHeight: 1.3 }}>{l.product.name}</span>
                  <button onClick={() => onRemove(l.product.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {/* Qty */}
                  <button onClick={() => onSetQty(l.product.id, l.quantity - 1)}
                    style={{ width: 20, height: 20, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" value={l.quantity} min={1}
                    onChange={e => onSetQty(l.product.id, parseInt(e.target.value) || 1)}
                    style={{ width: 34, height: 20, border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 11, outline: 'none' }} />
                  <button onClick={() => onSetQty(l.product.id, l.quantity + 1)}
                    style={{ width: 20, height: 20, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  {/* Giảm giá */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                    <input type="number" value={l.discount} min={0} max={100}
                      onChange={e => onSetDiscount(l.product.id, parseInt(e.target.value) || 0)}
                      style={{ width: 32, height: 20, border: '1px solid #d1d5db', borderRadius: 4, textAlign: 'center', fontSize: 11, outline: 'none' }} />
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>%</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#006E1C', marginTop: 4 }}>
                  {fmt(lineTotal(l))} ₫
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Ghi chú */}
        <textarea value={note} onChange={e => onNote(e.target.value)}
          placeholder="Ghi chú đơn hàng..." rows={2}
          style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
        {/* Tổng */}
        {cart.length > 0 && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#0E176E' }}>
              <span>Tổng cộng</span>
              <span>{fmt(grandTotal)} ₫</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}