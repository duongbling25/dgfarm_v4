// ============================================================
// APPLICATION LAYER - AdjustStockUseCase.ts
// Nhiệm vụ: "Đầu não" điều phối toàn bộ luồng Cân bằng kho.
//   1. Nhận DTO từ UI
//   2. Validate dữ liệu qua DTO validator
//   3. Với mỗi item: tự tính lại diff_quantity và diff_value (KHÔNG tin UI tính)
//   4. Gọi InventoryRepository để cập nhật product stock và inventory_check_items
//   5. Gọi InventoryRepository để cập nhật tổng hợp phiếu kiểm (tổng tăng/giảm)
//   6. Cập nhật trạng thái phiếu thành "Đã cân bằng"
// KHÔNG render UI, KHÔNG gọi Supabase trực tiếp (qua Repository).
// ============================================================

import { InventoryRepository } from '@/infrastructure/supabase/repositories/InventoryRepository';
import {
  AdjustStockInputDTO,
  InventoryCheckItemDTO,
  validateAdjustStockInput,
} from '@/application/dto/Inventoryinput.dto';

export interface AdjustStockResult {
  success: boolean;
  totalIncrease: number;
  totalDecrease: number;
  totalDiffValue: number;
  error?: string;
}

export class AdjustStockUseCase {
  private inventoryRepo: InventoryRepository;
 
  constructor(inventoryRepo?: InventoryRepository) {
    this.inventoryRepo = inventoryRepo || new InventoryRepository();
  }
 
  async execute(input: AdjustStockInputDTO): Promise<AdjustStockResult> {
    // Bước 1: Validate đầu vào
    const validationError = validateAdjustStockInput(input);
    if (validationError) {
      return { success: false, totalIncrease: 0, totalDecrease: 0, totalDiffValue: 0, error: validationError };
    }
 
    // Bước 2: UseCase tự tính lại các con số (đảm bảo tính chính xác cho DB)
    const recalculatedItems = input.items.map((item) => {
      const diff_quantity = item.actual_quantity - item.stock_quantity;
      const diff_value = diff_quantity * item.sell_price;
      return { ...item, diff_quantity, diff_value };
    });
 
    // Bước 3: Tổng hợp các chỉ số chênh lệch
    let totalIncrease = 0;
    let totalDecrease = 0;
    let totalDiffValue = 0;
 
    recalculatedItems.forEach((item) => {
      if (item.diff_quantity > 0) totalIncrease += item.diff_quantity;
      else if (item.diff_quantity < 0) totalDecrease += Math.abs(item.diff_quantity);
      totalDiffValue += item.diff_value;
    });
 
    // Bước 4: Gọi Repository để thực thi Giao dịch nguyên tử (Atomic Transaction)
    // Thay vì loop từng item gây chậm và rủi ro data rác, ta gọi 1 RPC duy nhất.
    try {
      await this.inventoryRepo.performAtomicAdjustment({
        inventory_check_id: input.inventory_check_id,
        balanced_by: input.balanced_by,
        items: recalculatedItems,
        total_increase: totalIncrease,
        total_decrease: totalDecrease,
      });
 
      return { success: true, totalIncrease, totalDecrease, totalDiffValue };
    } catch (error: any) {
      console.error('[AdjustStockUseCase] Lỗi cân bằng kho (Atomic):', error);
      return {
        success: false,
        totalIncrease: 0,
        totalDecrease: 0,
        totalDiffValue: 0,
        error: error.message || 'Lỗi không xác định khi cân bằng kho',
      };
    }
  }
}