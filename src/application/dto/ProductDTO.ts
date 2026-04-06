// src/application/dto/ProductDTO.ts

import type { ProductType, ProductGroup } from '@/domain/entities/Product'

export interface AddProductDTO {
  name: string
  group: ProductGroup
  type: ProductType
  sell_price: number
  cost_price: number
  stock: number
  min_stock: number
  max_stock: number
  location?: string
  brand?: string
  supplier_id?: string
  can_sell_direct: boolean
  has_points: boolean
  note?: string
  image_url?: string
  expected_order?: number
  unit?: string
  barcode?: string
}

export interface UpdateProductDTO {
  name?: string
  group?: ProductGroup
  type?: ProductType
  sell_price?: number
  cost_price?: number
  stock?: number
  min_stock?: number
  max_stock?: number
  location?: string | null
  brand?: string | null
  supplier_id?: string | null
  can_sell_direct?: boolean
  has_points?: boolean
  note?: string | null
  image_url?: string | null
  expected_order?: number | null
  unit?: string | null
  barcode?: string | null
}

export interface ProductFiltersDTO {
  search?: string
  type?: ProductType
  group?: ProductGroup
  stock_status?: 'all' | 'below_min' | 'above_max' | 'in_stock' | 'out_of_stock'
}
