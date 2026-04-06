// ============================================================
// APPLICATION LAYER - RecordHarvestUseCase.ts
// Nhiệm vụ: Điều phối toàn bộ luồng Ghi nhận Thu hoạch.
//   1. Validate đầu vào qua HarvestInput DTO
//   2. Lấy thông tin sản phẩm (tên, đơn vị, tồn hiện tại) từ Repository
//   3. Tính stock mới: Stock_mới = Stock_hiện_tại + Quantity_thu_hoạch
//   4. Gọi HarvestRepository lưu bản ghi thu hoạch
//   5. Gọi HarvestRepository cập nhật stock sản phẩm
// KHÔNG render UI, KHÔNG gọi Supabase trực tiếp (qua Repository).
// ============================================================

import { HarvestRepository } from '@/infrastructure/supabase/repositories/HarvestRepository';
import { HarvestInputDTO, validateHarvestInput } from '@/application/dto/HarvestInput.dto';

export interface RecordHarvestResult {
  success: boolean;
  newStock?: number;
  harvestId?: string;
  error?: string;
}

export class RecordHarvestUseCase {
  private harvestRepo: HarvestRepository;

  constructor() {
    this.harvestRepo = new HarvestRepository();
  }

  async execute(input: HarvestInputDTO, currentUser: string): Promise<RecordHarvestResult> {
    // Bước 1: Validate đầu vào (ngày không tương lai, số lượng > 0...)
    const validationError = validateHarvestInput(input);
    if (validationError) {
      return { success: false, error: validationError };
    }

    try {
      // Bước 2: Lấy thông tin sản phẩm từ DB (để có tên, đơn vị, tồn hiện tại)
      const product = await this.harvestRepo.getProductInfo(input.product_id);
      if (!product) {
        return { success: false, error: 'Không tìm thấy sản phẩm' };
      }

      // Bước 3: UseCase tính stock mới - đây là LOGIC KINH DOANH cốt lõi
      const newStock = product.stock + input.quantity;

      // Bước 4: Lưu bản ghi thu hoạch vào bảng harvests
      const harvestRecord = await this.harvestRepo.saveHarvestRecord({
        product_id: input.product_id,
        product_name: product.name,
        quantity: input.quantity,
        unit: product.unit,
        harvest_date: input.harvest_date,
        creator: currentUser,
        notes: input.notes,
      });

      // Bước 5: Cập nhật tồn kho trong bảng products (tăng lên)
      await this.harvestRepo.updateProductStock(input.product_id, newStock);

      return {
        success: true,
        newStock,
        harvestId: harvestRecord.id,
      };
    } catch (error: any) {
      console.error('[RecordHarvestUseCase] Lỗi ghi nhận thu hoạch:', error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi ghi nhận thu hoạch',
      };
    }
  }
}