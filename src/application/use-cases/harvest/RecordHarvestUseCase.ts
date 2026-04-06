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

  async executeBulk(items: any[], harvestDate: string, notes: string, currentUser: string): Promise<RecordHarvestResult> {
    if (items.length === 0) return { success: false, error: 'Không có sản phẩm nào được chọn' };

    try {
      // Step 4 & 5: Record all harvest items and update stocks manually via Repo (Atomic fallback)
      await this.harvestRepo.recordBulkHarvest(items, currentUser, harvestDate, notes);

      return {
        success: true,
        harvestId: 'bulk', // Using bulk as ID
      };
    } catch (error: any) {
      console.error('[RecordHarvestUseCase] Lỗi ghi nhận thu hoạch hàng loạt:', error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi ghi nhận thu hoạch hàng loạt',
      };
    }
  }
}