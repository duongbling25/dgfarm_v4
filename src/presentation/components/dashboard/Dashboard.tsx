'use client'

import { JSX } from 'react'
import { useDashboard } from '@/presentation/hooks/useDashboard'
import { MonthlyRevenueSection } from './MonthlyRevenueSection'
import { RecentActivitiesSection } from './RecentActivitiesSection'
import { SalesPerformanceSection } from './SalesPerformanceSection'

const fmt = (n: number) =>
  n >= 1_000_000
    ? (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'tr'
    : n >= 1_000
    ? (n / 1_000).toFixed(0) + 'k'
    : String(n)

export const Dashboard = (): JSX.Element => {
  const { data, loading } = useDashboard()

  const totalRevenue  = data?.todaySummary?.totalRevenue  ?? 0
  const netRevenue    = data?.todaySummary?.netRevenue    ?? 0
  const totalOrders   = data?.todaySummary?.totalOrders   ?? 0
  const lowStockCount = data?.lowStockCount              ?? 0

  const statCards = [
    {
      label: loading ? '...' : `Doanh thu hôm nay`,
      value: loading ? '—' : fmt(totalRevenue) + '₫',
      iconBg: 'bg-[#FFF5D9]',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3zm0 2c-5.33 0-8 2.686-8 4v1h16v-1c0-1.314-2.67-4-8-4z" fill="#FFBB38"/>
        </svg>
      ),
    },
    {
      label: 'Doanh thu thuần (HĐ+NPP)',
      value: loading ? '—' : fmt(netRevenue) + '₫',
      iconBg: 'bg-[#E7F9EE]',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#2D9A47"/>
        </svg>
      ),
    },
    {
      label: 'Đơn đang xử lý',
      value: loading ? '—' : String(data?.todaySummary?.pendingOrders ?? 0),
      iconBg: 'bg-[#FFE0EB]',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" fill="#FF82AC"/>
        </svg>
      ),
    },
    {
      label: 'Sắp hết hàng',
      value: loading ? '—' : String(lowStockCount),
      iconBg: 'bg-[#DCFAF8]',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#16DBCC"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-['Inter',sans-serif] w-full">
      <div className="max-w-[1440px] mx-auto px-6 py-6">

        <h2 className="text-[#343C6A] text-[22px] font-semibold mb-6">
          Kết quả bán hàng hôm nay
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-[25px] px-8 py-5 flex items-center gap-4 shadow-sm">
              <div className={`${card.iconBg} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div>
                <p className="text-[#718EBF] text-sm">{card.label}</p>
                <p className="text-[#232323] text-2xl font-semibold">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <MonthlyRevenueSection monthlyRevenue={data?.monthlyRevenue ?? []} loading={loading} />
          </div>
          <div className="lg:col-span-1">
            <RecentActivitiesSection activities={data?.recentActivities ?? []} loading={loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="w-full">
            <SalesPerformanceSection topProducts={data?.topProducts ?? []} loading={loading} />
          </div>
        </div>

      </div>
    </div>
  )
}
