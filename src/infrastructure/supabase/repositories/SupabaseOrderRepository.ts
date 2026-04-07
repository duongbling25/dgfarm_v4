// src/infrastructure/supabase/repositories/SupabaseOrderRepository.ts

import { createClient } from '@/infrastructure/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IOrderRepository } from '@/domain/repositories/IOrderRepository'

export class SupabaseOrderRepository implements IOrderRepository {

  async findAll() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('ordered_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async findTodaySummary() {
    const supabase = await createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Customer orders
    const { data: custData, error: custErr } = await supabase
      .from('orders')
      .select('total, workflow_status')
      .gte('ordered_at', today.toISOString())

    if (custErr) throw custErr

    // 2. Distributor orders
    const { data: distData, error: distErr } = await supabase
      .from('distributor_orders')
      .select('total, status')
      .gte('ordered_at', today.toISOString())

    if (distErr) throw distErr

    const custCompleted = (custData ?? []).filter(o => o.workflow_status === 'Hoàn thành')
    const distCompleted = (distData ?? []).filter(o => o.status === 'Hoàn thành')

    const customerRevenue = custCompleted.reduce((s, o) => s + Number(o.total), 0)
    const distributorRevenue = distCompleted.reduce((s, o) => s + Number(o.total), 0)

    const totalRevenue  = customerRevenue
    const netRevenue    = customerRevenue + distributorRevenue

    const totalOrders   = (custData ?? []).length
    const pendingOrders = (custData ?? []).filter(o =>
      ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao'].includes(o.workflow_status)
    ).length

    return { totalRevenue, netRevenue, totalOrders, pendingOrders }
  }

  async findMonthlyRevenue() {
    const supabase = await createClient()
    
    // 1. Fetch from customer orders
    const { data: custData, error: custErr } = await supabase
      .from('orders')
      .select('total, ordered_at')
      .eq('workflow_status', 'Hoàn thành')
      .order('ordered_at', { ascending: true })

    if (custErr) throw custErr

    // 2. Fetch from distributor orders
    const { data: distData, error: distErr } = await supabase
      .from('distributor_orders')
      .select('total, ordered_at')
      .eq('status', 'Hoàn thành')
      .order('ordered_at', { ascending: true })

    if (distErr) throw distErr

    const map = new Map<string, number>()
    
    // Helper to group by month
    const processRows = (rows: any[]) => {
      for (const row of rows) {
        const date = new Date(row.ordered_at)
        const month = date.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
        map.set(month, (map.get(month) ?? 0) + Number(row.total))
      }
    }

    processRows(custData ?? [])
    processRows(distData ?? [])

    return Array.from(map.entries()).map(([month, revenue]) => ({ month, revenue }))
  }

  async findTopSellingProducts() {
    const supabase = await createClient()

    // 1. Customer order items
    const { data: custItems, error: custErr } = await supabase
      .from('order_items')
      .select('product_name, product_code, quantity')

    if (custErr) throw custErr

    // 2. Distributor order items
    const { data: distItems, error: distErr } = await supabase
      .from('distributor_order_items')
      .select('product_name, product_code, quantity')

    if (distErr) throw distErr

    const map = new Map<string, { name: string; total: number }>()
    
    const processItems = (items: any[]) => {
      for (const row of items ?? []) {
        const existing = map.get(row.product_code) ?? { name: row.product_name, total: 0 }
        map.set(row.product_code, { ...existing, total: existing.total + Number(row.quantity) })
      }
    }

    processItems(custItems)
    processItems(distItems)

    return Array.from(map.entries())
      .map(([code, val]) => ({ code, name: val.name, totalSold: val.total }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5)
  }

  async findLowStockCount(): Promise<number> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('id, stock, min_stock')
      .gt('min_stock', 0)
    if (error) throw error
    return (data ?? []).filter(p => Number(p.stock) < Number(p.min_stock)).length
  }

  async findRecentActivities() {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, staff_id, action, target_id, note, created_at')
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) throw error
    return data ?? []
  }

  async findConflictedOrders(productCode: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('get_conflicted_orders', { p_product_code: productCode })
    if (error) throw new Error(error.message)
    return data ?? []
  }

  async resolveConflict(conflictId: string, resolution: {
    confirmOrderId: string
    cancelOrderIds: string[]
    handledBy: string
    note?: string
  }): Promise<void> {
    const supabase = await createClient()

    await supabase.from('order_conflicts').update({
      status:      'resolved',
      resolution:  'confirmed_high',
      handled_by:  resolution.handledBy,
      note:        resolution.note ?? null,
      resolved_at: new Date().toISOString(),
      resolved_by_priority: true,
    }).eq('id', conflictId)

    await supabase.from('orders')
      .update({ workflow_status: 'Đã xác nhận' })
      .eq('id', resolution.confirmOrderId)

    if (resolution.cancelOrderIds.length > 0) {
      await supabase.from('orders')
        .update({ workflow_status: 'Đã hủy' })
        .in('id', resolution.cancelOrderIds)
    }

    revalidatePath('/giao-dich/dat-hang/khach-hang')
  }

  async deleteMany(ids: string[]): Promise<void> {
    const supabase = await createClient()
    const { error: itemErr } = await supabase.from('order_items').delete().in('order_id', ids)
    if (itemErr) throw new Error(itemErr.message)
    const { error: orderErr } = await supabase.from('orders').delete().in('id', ids)
    if (orderErr) throw new Error(orderErr.message)
    revalidatePath('/giao-dich/hoa-don')
  }
}
