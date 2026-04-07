// src/app/(admin)/giao-dich/dat-hang/nha-phan-phoi/page.tsx

import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { SupabaseDistributorRepository } from '@/infrastructure/supabase/repositories/SupabaseDistributorRepository'
import { SupabaseDistributorOrderRepository } from '@/infrastructure/supabase/repositories/SupabaseDistributorOrderRepository'
import { SupabaseProductRepository } from '@/infrastructure/supabase/repositories/SupabaseProductRepository'
import DistributorOrderTable from '@/presentation/components/distributor/DistributorOrderTable'
import type { DistributorOrderStatus } from '@/domain/entities/DistributorOrder'
import type { CreateDistributorOrderInput } from '@/domain/repositories/IDistributorOrderRepository'

export const dynamic = 'force-dynamic'

export default async function DatHangNhaPhanPhoiPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .schema('nhan_su')
    .from('accounts')
    .select('id, role, name')
    .eq('auth_id', user.id)
    .single()

  const role = (account?.role as 'admin' | 'manager' | 'staff') ?? 'staff'
  const accountId = account?.id ?? ''

  const distRepo = new SupabaseDistributorRepository()
  const orderRepo = new SupabaseDistributorOrderRepository()
  const productRepo = new SupabaseProductRepository()

  const [distributors, orders, products] = await Promise.all([
    distRepo.getAll(),
    orderRepo.getAll(),
    productRepo.getAll(),
  ])

  async function createOrder(input: CreateDistributorOrderInput): Promise<string> {
    'use server'
    const repo = new SupabaseDistributorOrderRepository()
    return repo.create(input)
  }

  async function updateStatus(id: string, status: DistributorOrderStatus): Promise<void> {
    'use server'
    const repo = new SupabaseDistributorOrderRepository()
    return repo.updateStatus(id, status)
  }

  return (
    <DistributorOrderTable
      initialOrders={orders}
      distributors={distributors}
      products={products}
      role={role}
      accountId={accountId}
      onCreateOrder={createOrder}
      onUpdateStatus={updateStatus}
    />
  )
}