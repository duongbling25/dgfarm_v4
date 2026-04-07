import { createClient } from '@/infrastructure/supabase/server'
import { redirect } from 'next/navigation'
import { getCustomerInvoicesUseCase } from '@/application/use-cases/order/GetCustomerInvoicesUseCase'
import { getOrderRepository } from '@/infrastructure/container/DIContainer'
import { revalidatePath } from 'next/cache'
import CustomerInvoiceTable from '@/presentation/components/invoice/CustomerInvoiceTable'

export const dynamic = 'force-dynamic'

export default async function HoaDonKhachHangPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const invoices = await getCustomerInvoicesUseCase()

  async function deleteInvoicesAction(ids: string[]) {
    'use server'
    const repo = getOrderRepository()
    await repo.deleteMany(ids)
    revalidatePath('/giao-dich/hoa-don/khach-hang')
  }

  return <CustomerInvoiceTable initialInvoices={invoices} onDeleteMany={deleteInvoicesAction} />
}