// src/presentation/hooks/useDashboard.ts
'use client'

import { useEffect, useState } from 'react'

export interface ActivityLog {
  id: number
  staff_id: string
  action: string
  target_id: string | null
  note: string | null
  created_at: string
}

export interface DashboardData {
  todaySummary: {
    totalRevenue:  number
    netRevenue:    number
    totalOrders:   number
    pendingOrders: number
  }
  monthlyRevenue: { month: string; revenue: number }[]
  topProducts: { code: string; name: string; totalSold: number }[]
  lowStockCount: number
  recentActivities: ActivityLog[]
}

export function useDashboard() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard-summary')
      .then(res => res.json())
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
