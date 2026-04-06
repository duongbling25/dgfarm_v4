// src/infrastructure/supabase/repositories/SupabaseProductRepository.ts

import { createClient } from '@/infrastructure/supabase/server'
import { revalidatePath } from 'next/cache'
import type { IProductRepository } from '@/domain/repositories/IProductRepository'
import type { Product, ProductFilters } from '@/domain/entities/Product'

export class SupabaseProductRepository implements IProductRepository {

  // ── Helpers ─────────────────────────────────────────────────
  private toEntity(row: any): Product {
    return {
      id:             row.id,
      code:           row.id,
      name:           row.name,
      group:          row.group,
      type:           row.type,
      sell_price:     Number(row.sell_price),
      cost_price:     Number(row.cost_price),
      stock:          Number(row.stock),
      min_stock:      Number(row.min_stock ?? 0),
      max_stock:      Number(row.max_stock ?? 9999),
      location:       row.location ?? null,
      brand:          row.brand ?? null,
      supplier_id:    row.supplier_id ?? null,
      supplier_name:  row.supplier_name ?? null,
      can_sell_direct: row.can_sell_direct ?? true,
      has_points:     row.has_points ?? false,
      note:           row.note ?? null,
      image_url:      row.image_url ?? null,
      expected_order: row.expected_order != null ? Number(row.expected_order) : null,
      unit:           row.unit ?? null,
      barcode:        row.barcode ?? null,
      created_at:     row.created_at,
    }
  }

  private async genId(supabase: any): Promise<string> {
    const { data: last } = await supabase
      .from('products')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
    const nextNum = last?.[0]?.id
      ? parseInt(last[0].id.replace('SP', ''), 10) + 1
      : 1
    return 'SP' + String(nextNum).padStart(6, '0')
  }

  // ── Read ────────────────────────────────────────────────────
  async getAll(filters?: ProductFilters): Promise<Product[]> {
    const supabase = await createClient()
    let q = supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true })

    if (filters?.search) {
      const s = filters.search
      q = q.or(`id.ilike.%${s}%,name.ilike.%${s}%`)
    }
    if (filters?.type)  q = q.eq('type', filters.type)
    if (filters?.group) q = q.eq('group', filters.group)
    if (filters?.stock_status === 'out_of_stock') q = q.eq('stock', 0)
    if (filters?.stock_status === 'in_stock')     q = q.gt('stock', 0)
    // below_min và above_max cần so sánh 2 cột → xử lý client-side bên dưới

    const { data, error } = await q
    if (error) throw new Error(error.message)

    let rows = (data ?? []).map(this.toEntity)

    // client-side filter for below_min / above_max (cần so sánh 2 cột)
    if (filters?.stock_status === 'below_min') {
      rows = rows.filter(p => p.stock < p.min_stock)
    }
    if (filters?.stock_status === 'above_max') {
      rows = rows.filter(p => p.stock > p.max_stock)
    }

    return rows
  }

  async getById(id: string): Promise<Product | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return this.toEntity(data)
  }

  // ── Mutate ──────────────────────────────────────────────────
  async add(data: Omit<Product, 'id' | 'code' | 'created_at'>): Promise<void> {
    const supabase = await createClient()
    const id = await this.genId(supabase)
    const { error } = await supabase.from('products').insert({
      id,
      name:           data.name,
      group:          data.group,
      type:           data.type,
      sell_price:     data.sell_price,
      cost_price:     data.cost_price,
      stock:          data.stock,
      min_stock:      data.min_stock,
      max_stock:      data.max_stock,
      location:       data.location ?? null,
      brand:          data.brand ?? null,
      supplier_id:    data.supplier_id ?? null,
      can_sell_direct: data.can_sell_direct,
      has_points:     data.has_points,
      note:           data.note ?? null,
      image_url:      data.image_url ?? null,
      expected_order: data.expected_order ?? null,
      unit:           data.unit ?? null,
      created_at:     new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
    revalidatePath('/hang-hoa')
  }

  async update(id: string, data: Partial<Omit<Product, 'id' | 'code' | 'created_at'>>): Promise<void> {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { code, ...rest } = data as any
    const { error } = await supabase.from('products').update(rest).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/hang-hoa')
  }

  async deleteMany(ids: string[]): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('products').delete().in('id', ids)
    if (error) throw new Error(error.message)
    revalidatePath('/hang-hoa')
  }

  async findTopSelling(): Promise<{ product: Product; totalSold: number }[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('order_items')
      .select('product_id, product_name, quantity, unit')
      .order('quantity', { ascending: false })
    if (error) throw new Error(error.message)

    const map = new Map<string, { name: string; total: number }>()
    for (const row of data ?? []) {
      const ex = map.get(row.product_id) ?? { name: row.product_name, total: 0 }
      map.set(row.product_id, { ...ex, total: ex.total + Number(row.quantity) })
    }

    return Array.from(map.entries())
      .map(([id, val]) => ({
        product: { id, code: id, name: val.name } as Product,
        totalSold: val.total,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5)
  }
}
