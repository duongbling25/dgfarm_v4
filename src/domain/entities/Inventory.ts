// ============================================================
// DOMAIN LAYER - Inventory.ts
// Nhiệm vụ: Định nghĩa Interface InventoryCheck và InventoryCheckItem
// khớp với Schema Database. Đây là "ngôn ngữ chung" cho toàn bộ hệ thống.
// KHÔNG chứa logic, KHÔNG gọi API, KHÔNG import thư viện ngoài.
// ============================================================

import { ReactNode } from "react";

export type InventoryStatus = 'Phiếu tạm' | 'Đã cân bằng' | 'Đã hủy';

export interface InventoryCheck {
  id: string;
  code: string;
  creator: string;
  actual_quantity: number;
  status: InventoryStatus;
  notes?: string;
  balanced_by?: string;
  balanced_at?: string;
  total_items: number;      // dùng cái này
  total_increase: number;   // dùng cái này
  total_decrease: number;   // dùng cái này
  created_at: string;
  updated_at: string;
  // XÓA: increase_qty, item_count (không tồn tại trong DB)
}

export interface InventoryItem {
  id: string;
  inventory_check_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  barcode: string | null;
  stock_quantity: number;
  actual_quantity: number;
  diff_quantity: number;   // = actual_quantity - stock_quantity
  sell_price: number;
  diff_value: number;      // = diff_quantity * sell_price
  note?: string;
  created_at: string;
  updated_at?: string;
}

export interface InventoryCheckWithItems extends InventoryCheck {
  items: InventoryItem[];
}

export interface InventoryFilter {
  status?: InventoryStatus;
  createdFrom?: string;
  createdTo?: string;
  creator?: string;
  searchCode?: string;
}