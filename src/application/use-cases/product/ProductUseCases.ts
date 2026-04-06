// src/application/use-cases/product/ProductUseCases.ts
'use server'

import { getProductRepository } from '@/infrastructure/container/DIContainer'
import type { AddProductDTO, UpdateProductDTO, ProductFiltersDTO } from '@/application/dto/ProductDTO'

// ── Read ────────────────────────────────────────────────────────
export async function getProductsUseCase(filters?: ProductFiltersDTO) {
  return getProductRepository().getAll(filters)
}

export async function getProductByIdUseCase(id: string) {
  return getProductRepository().getById(id)
}

// ── Mutate ──────────────────────────────────────────────────────
export async function addProductUseCase(form: AddProductDTO) {
  if (!form.name?.trim())          throw new Error('Tên hàng không được rỗng')
  if (form.sell_price < 0)         throw new Error('Giá bán không hợp lệ')
  if (form.cost_price < 0)         throw new Error('Giá vốn không hợp lệ')
  if (form.stock < 0)              throw new Error('Tồn kho không hợp lệ')
  if (form.min_stock < 0)          throw new Error('Định mức min không hợp lệ')
  if (form.max_stock < form.min_stock) throw new Error('Định mức max phải ≥ min')

  // Tìm xem đã tồn tại chưa (theo id nếu có, hoặc theo tên)
  const repo = getProductRepository()
  if ((form as any).id?.trim()) {
    const existing = await repo.getById((form as any).id)
    if (existing) {
      return repo.update(existing.id, {
        ...form,
        stock: existing.stock + form.stock, // cộng dồn tồn kho
      })
    }
  }

  return repo.add({
    name: form.name.trim(),
    group: form.group,
    type: form.type,
    sell_price: form.sell_price,
    cost_price: form.cost_price,
    stock: form.stock,
    min_stock: form.min_stock,
    max_stock: form.max_stock,
    location: form.location || null,
    brand: form.brand || null,
    supplier_id: form.supplier_id || null,
    supplier_name: null,
    can_sell_direct: form.can_sell_direct,
    has_points: form.has_points,
    note: form.note || null,
    image_url: form.image_url || null,
    expected_order: form.expected_order ?? null,
    unit: (form as any).unit ?? null,
    barcode: (form as any).barcode ?? null,
  })
}

export async function bulkAddProductsUseCase(forms: AddProductDTO[]) {
  const results = []
  // Gom nhóm theo id (nếu có) để cộng dồn stock trước khi gửi
  const merged = new Map<string, AddProductDTO>()
  const ordered: AddProductDTO[] = []

  for (const form of forms) {
    const key = (form as any).id?.trim()
    if (key) {
      if (merged.has(key)) {
        merged.get(key)!.stock += form.stock
      } else {
        const clone = { ...form }
        merged.set(key, clone)
        ordered.push(clone)
      }
    } else {
      ordered.push(form)
    }
  }

  for (const form of ordered) {
    try {
      await addProductUseCase(form)
      results.push({ ok: true })
    } catch (e: any) {
      results.push({ ok: false, error: e.message })
    }
  }
  return results
}

export async function updateProductUseCase(id: string, form: UpdateProductDTO) {
  if (form.name !== undefined && !form.name?.trim()) throw new Error('Tên hàng không được rỗng')
  const { branch_stock: _, ...safeForm } = form as any
  return getProductRepository().update(id, safeForm)
}

export async function deleteProductsUseCase(ids: string[]) {
  if (ids.length === 0) throw new Error('Chưa chọn hàng hóa')
  return getProductRepository().deleteMany(ids)
}