// src/domain/repositories/IOrderRepository.ts

export interface IOrderRepository {
  findAll(): Promise<any[]>
  findTodaySummary(): Promise<{
    totalRevenue: number
    netRevenue: number
    totalOrders: number
    pendingOrders: number
  }>
  findMonthlyRevenue(): Promise<{ month: string; revenue: number }[]>
  findTopSellingProducts(): Promise<{ code: string; name: string; totalSold: number }[]>
  findLowStockCount(): Promise<number>
  findRecentActivities(): Promise<{
    id: number
    staff_id: string
    action: string
    target_id: string | null
    note: string | null
    created_at: string
  }[]>
  findConflictedOrders(productCode: string): Promise<{
    order_id: string
    customer_id: string
    customer_name: string
    customer_tier: string
    ordered_at: string
    quantity: number
    priority_score: number
  }[]>
  resolveConflict(conflictId: string, resolution: {
    confirmOrderId: string
    cancelOrderIds: string[]
    handledBy: string
    note?: string
  }): Promise<void>
  deleteMany(ids: string[]): Promise<void>
}
