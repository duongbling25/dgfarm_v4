// src/presentation/components/product/ProductCard.tsx
'use client'

import React from 'react'
import type { Product } from '@/domain/entities/Product'
import { getStockStatus, stockStatusColor } from '@/domain/services/InventoryService'
import { useCart } from '@/presentation/hooks/useCart'

const fmt = (n: number) => n.toLocaleString('vi-VN')

interface ProductCardProps {
  product: Product
  onClick?: () => void
  /** storefront mode hides internal fields like cost_price */
  mode?: 'storefront' | 'admin'
}

// Icons
const IcCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)
const IcPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)

export default function ProductCard({ product, onClick, mode = 'storefront' }: ProductCardProps) {
  const { addItem, openCart } = useCart()
  const stockStatus = getStockStatus(product)
const outOfStock = stockStatus === 'out_of_stock'
const stockLow   = stockStatus === 'below_min'

  function handleAddToCart(e: React.MouseEvent) {
    e.stopPropagation()
    if (outOfStock) return
    addItem({
      productId:   product.id,
      productCode: product.code ?? product.id,
      productName: product.name,
      quantity:    1,
      unitPrice:   product.sell_price,
      imageUrl:    product.image_url ?? undefined,
    })
    openCart()
  }

  const groupColors: Record<string, string> = {
    'Trái cây':  '#006E1C',
    'Rau củ':    '#15803d',
    'Thực phẩm': '#7c3aed',
    'Đồ uống':   '#0369a1',
    'Khác':      '#9a3412',
  }
  const groupColor = groupColors[product.group] ?? '#374151'

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Image area */}
      <div style={{
        width: '100%',
        aspectRatio: '1',
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 52, userSelect: 'none' }}>🌿</span>
        )}

        {/* Badges & Overlays */}
        {outOfStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: '#EF4444', color: '#fff', padding: '4px 14px',
              borderRadius: 20, fontSize: 12, fontWeight: 700,
            }}>Hết hàng</span>
          </div>
        )}

        {stockLow && !outOfStock && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: '#FEF3C7', color: '#B45309',
            borderRadius: 6, padding: '2px 8px',
            fontSize: 10, fontWeight: 700,
          }}>
            Còn ít
          </div>
        )}

        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(255,255,255,0.92)',
          border: `1px solid ${groupColor}22`,
          borderRadius: 20,
          padding: '2px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: groupColor,
        }}>
          {product.group}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        
        {/* Admin only: Code */}
        {mode === 'admin' && product.code && (
           <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>#{product.code}</div>
        )}

        {product.supplier_name && (
          <div style={{ fontSize: 11, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 3 }}>
            <IcPin />
            {product.supplier_name}
          </div>
        )}

        {/* Name */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </div>

        {/* Price & Stock Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 4 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#006E1C' }}>
              {fmt(product.sell_price)} ₫
            </div>
            {/* Show cost price ONLY in admin mode */}
            {mode === 'admin' && product.cost_price && (
                <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 500 }}>
                    Vốn: {fmt(product.cost_price)} ₫
                </div>
            )}
            {product.unit && mode === 'storefront' && (
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>/{product.unit}</div>
            )}
          </div>

          {/* Stock count ONLY in admin mode */}
          {mode === 'admin' && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: stockStatusColor(stockStatus) }}>
                {product.stock}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>tồn {product.unit}</div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {mode === 'admin' ? (
            <button
                style={{
                    width: '100%', height: 36, borderRadius: 8, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', marginTop: 4, transition: 'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
                Chỉnh sửa
            </button>
        ) : (
            product.can_sell_direct && (
                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock}
                  style={{
                    width: '100%', height: 36, borderRadius: 8, border: 'none',
                    background: outOfStock ? '#E5E7EB' : '#006E1C',
                    color: outOfStock ? '#9CA3AF' : '#fff',
                    fontSize: 13, fontWeight: 600, cursor: outOfStock ? 'not-allowed' : 'pointer',
                    marginTop: 4, transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.background = '#005c17' }}
                  onMouseLeave={e => { if (!outOfStock) e.currentTarget.style.background = '#006E1C' }}
                >
                  {!outOfStock && <IcCart />}
                  {outOfStock ? 'Hết hàng' : 'Thêm vào giỏ'}
                </button>
            )
        )}
      </div>
    </div>
  )
}