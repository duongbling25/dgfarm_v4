export type ProductType = 'Hàng hóa' | 'Dịch vụ' | 'Combo - Đóng gói'
export type ProductGroup = 'Trái cây' | 'Rau củ' | 'Thực phẩm' | 'Đồ uống' | 'Khác'

export interface Product {
  id: string              // SP000001
  code: string
  name: string
  group: ProductGroup
  type: ProductType
  sell_price: number
  cost_price: number
  stock: number
  min_stock: number
  max_stock: number
  location: string | null
  brand: string | null
  supplier_id: string | null
  supplier_name: string | null
  can_sell_direct: boolean
  has_points: boolean
  note: string | null
  image_url: string | null
  expected_order: number | null
  unit: string | null
  barcode: string | null
  created_at: string
}

export interface ProductFilters {
  search?: string
  type?: ProductType
  group?: ProductGroup
  stock_status?: 'all' | 'below_min' | 'above_max' | 'in_stock' | 'out_of_stock'
}