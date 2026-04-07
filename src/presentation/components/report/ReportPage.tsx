// src/presentation/components/report/ReportPage.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/infrastructure/supabase/client'

const fmt   = (n: number) => n.toLocaleString('vi-VN')
const supabase = createClient()

interface MonthlyStat { month: string; revenue: number; orders: number }
interface TopProduct   { name: string; code: string; totalSold: number }

export default function ReportPage() {
  const [monthly, setMonthly]       = useState<MonthlyStat[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<'revenue' | 'products'>('revenue')

  useEffect(() => {
    Promise.all([
      // regular orders
      supabase.from('orders').select('total, ordered_at').eq('workflow_status', 'Hoàn thành'),
      supabase.from('order_items').select('product_code, product_name, quantity'),
      // distributor orders
      supabase.from('distributor_orders').select('total, ordered_at').eq('status', 'Hoàn thành'),
      supabase.from('distributor_order_items').select('product_code, product_name, quantity'),
    ]).then(([ordersRes, itemsRes, distOrdersRes, distItemsRes]) => {
      // 1. Combine and Process Monthly Revenue
      const map = new Map<string, { revenue: number; orders: number }>()
      
      const processOrders = (rows: any[]) => {
        for (const o of rows) {
          const month = new Date(o.ordered_at).toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
          const ex = map.get(month) ?? { revenue: 0, orders: 0 }
          map.set(month, { revenue: ex.revenue + Number(o.total), orders: ex.orders + 1 })
        }
      }

      processOrders(ordersRes.data ?? [])
      processOrders(distOrdersRes.data ?? [])
      
      const sortedMonthly = Array.from(map.entries())
        .map(([month, v]) => ({ month, ...v }))
        .sort((a, b) => {
          const parseDate = (s: string) => {
            const [m, y] = s.split(' ')
            return new Date(2000 + parseInt(y), parseInt(m) - 1).getTime()
          }
          try { return parseDate(a.month) - parseDate(b.month) } catch { return 0 }
        })

      setMonthly(sortedMonthly)

      // 2. Combine and Process Top Products
      const pmap = new Map<string, { name: string; totalSold: number }>()
      
      const processItems = (rows: any[]) => {
        for (const i of rows) {
          const ex = pmap.get(i.product_code) ?? { name: i.product_name, totalSold: 0 }
          pmap.set(i.product_code, { ...ex, totalSold: ex.totalSold + Number(i.quantity) })
        }
      }

      processItems(itemsRes.data ?? [])
      processItems(distItemsRes.data ?? [])

      setTopProducts(
        Array.from(pmap.entries())
          .map(([code, v]) => ({ code, ...v }))
          .sort((a, b) => b.totalSold - a.totalSold)
          .slice(0, 10)
      )
      setLoading(false)
    })
  }, [])

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0)
  const totalOrders  = monthly.reduce((s, m) => s + m.orders, 0)
  const maxRevenue   = Math.max(...monthly.map(m => m.revenue), 1)

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#F9FAFB' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>Báo cáo</h1>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Tổng doanh thu', value: fmt(totalRevenue) + ' ₫', color: '#16A34A' },
          { label: 'Tổng đơn hàng', value: totalOrders.toString(), color: '#1D4ED8' },
          { label: 'Trung bình/đơn', value: totalOrders ? fmt(Math.round(totalRevenue / totalOrders)) + ' ₫' : '—', color: '#7C3AED' },
        ].map(c => (
          <div key={c.label} style={{
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {(['revenue', 'products'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '8px 8px 0 0', border: '1px solid',
            borderColor: tab === t ? '#006E1C' : '#E5E7EB',
            borderBottom: tab === t ? '1px solid #fff' : '1px solid #E5E7EB',
            background: tab === t ? '#fff' : '#F9FAFB',
            fontWeight: tab === t ? 700 : 500, fontSize: 13,
            color: tab === t ? '#006E1C' : '#6B7280', cursor: 'pointer',
          }}>
            {t === 'revenue' ? '📈 Doanh thu theo tháng' : '🏆 Top sản phẩm bán chạy'}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', border: '1px solid #E5E7EB', padding: 24, minHeight: 360 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Đang tải dữ liệu...</div>
        ) : tab === 'revenue' ? (
          monthly.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div>Chưa có dữ liệu doanh thu</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 240, padding: '0 8px' }}>
                {monthly.slice(-12).map(m => {
                  const barH = Math.max(4, Math.round((m.revenue / maxRevenue) * 200))
                  return (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>
                        {fmt(Math.round(m.revenue / 1000))}k
                      </div>
                      <div style={{
                        width: '100%', height: barH, background: 'linear-gradient(180deg,#4ADE80,#16A34A)',
                        borderRadius: '4px 4px 0 0', position: 'relative', minHeight: 4,
                        transition: 'height 0.3s',
                      }} title={`${m.month}: ${fmt(m.revenue)} ₫ · ${m.orders} đơn`} />
                      <div style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap' }}>{m.month}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 24, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {['Tháng', 'Doanh thu', 'Số đơn', 'TB/đơn'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Tháng' ? 'left' : 'right', color: '#374151', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m, i) => (
                      <tr key={m.month} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#FAFAFA' : '#fff' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{m.month}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16A34A', fontWeight: 700 }}>{fmt(m.revenue)} ₫</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>{m.orders}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#6B7280' }}>{m.orders ? fmt(Math.round(m.revenue / m.orders)) + ' ₫' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
              <div>Chưa có dữ liệu sản phẩm</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['#', 'Mã SP', 'Tên sản phẩm', 'Số lượng bán'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Số lượng bán' ? 'right' : 'left', color: '#374151', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.code} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 ? '#FAFAFA' : '#fff' }}>
                    <td style={{ padding: '10px 14px', color: '#94A3B8', fontWeight: 700 }}>#{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#006E1C' }}>{p.code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#1D4ED8' }}>
                      {fmt(p.totalSold)}
                      {/* Bar indicator */}
                      <div style={{
                        height: 3, background: '#DBEAFE', borderRadius: 2, marginTop: 4,
                        position: 'relative', overflow: 'hidden',
                      }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${Math.round((p.totalSold / topProducts[0].totalSold) * 100)}%`,
                          background: '#1D4ED8', borderRadius: 2,
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}
