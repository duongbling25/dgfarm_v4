// ============================================================
// INFRASTRUCTURE LAYER - InventoryRepository.ts
// ...
// ============================================================
'use client'
import { createClient } from '@/infrastructure/supabase/client';
import { InventoryCheck, InventoryItem, InventoryFilter } from '@/domain/entities/Inventory';
import { InventoryCheckItemDTO } from '@/application/dto/Inventoryinput.dto';

export class InventoryRepository {
  private get supabase() {
    return createClient();
  }

  async createCheck(data: { creator: string; notes?: string }): Promise<InventoryCheck> {
    const code = `KK${Date.now().toString().slice(-6)}`;
    const { data: result, error } = await this.supabase
      .from('inventory_checks')
      .insert([{
        code,
        creator: data.creator,
        notes: data.notes,
        status: 'Phiếu tạm',
        actual_quantity: 0,
        total_items: 0,
        total_increase: 0,
        total_decrease: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw new Error(`Tạo phiếu thất bại: ${error.message}`);
    return result;
  }

  async getCheckById(id: string): Promise<InventoryCheck | null> {
    const { data, error } = await this.supabase
      .from('inventory_checks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  async getAllChecks(filters?: InventoryFilter): Promise<InventoryCheck[]> {
    let query = this.supabase.from('inventory_checks').select('*');
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.creator) query = query.ilike('creator', `%${filters.creator}%`);
    if (filters?.createdFrom) query = query.gte('created_at', filters.createdFrom);
    if (filters?.createdTo) query = query.lte('created_at', filters.createdTo);
    if (filters?.searchCode) query = query.ilike('code', `%${filters.searchCode}%`);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(`Lấy danh sách phiếu thất bại: ${error.message}`);
    return data || [];
  }

  async getCheckItems(checkId: string): Promise<InventoryItem[]> {
    const { data, error } = await this.supabase
      .from('inventory_check_items')
      .select('*')
      .eq('inventory_check_id', checkId);
    if (error) throw new Error(`Lấy items phiếu thất bại: ${error.message}`);
    return data || [];
  }

  async addItem(item: {
    inventory_check_id: string;
    product_id: string;
    product_name: string;
    unit: string;
    stock_quantity: number;
    sell_price: number;
  }): Promise<InventoryItem> {
    const { data, error } = await this.supabase
      .from('inventory_check_items')
      .insert([{
        ...item,
        actual_quantity: 0,
        diff_quantity: 0,
        diff_value: 0,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (error) throw new Error(`Thêm sản phẩm vào phiếu thất bại: ${error.message}`);
    return data;
  }

  async balanceItems(items: InventoryCheckItemDTO[]): Promise<void> {
    for (const item of items) {
      const newStock = item.stock_quantity + item.diff_quantity;
      const { error: productError } = await this.supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', item.product_id);
      if (productError) throw new Error(`Cập nhật stock sản phẩm ${item.product_id} thất bại: ${productError.message}`);

      const { error: itemError } = await this.supabase
        .from('inventory_check_items')
        .update({
          actual_quantity: item.actual_quantity,
          diff_quantity: item.diff_quantity,
          diff_value: item.diff_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (itemError) throw new Error(`Cập nhật item ${item.id} thất bại: ${itemError.message}`);
    }
  }

  async completeCheck(id: string, data: {
    balanced_by: string;
    total_increase: number;
    total_decrease: number;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('inventory_checks')
      .update({
        status: 'Đã cân bằng',
        balanced_by: data.balanced_by,
        balanced_at: new Date().toISOString(),
        total_increase: data.total_increase,
        total_decrease: data.total_decrease,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(`Hoàn tất phiếu thất bại: ${error.message}`);
  }

  async cancelCheck(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('inventory_checks')
      .update({ status: 'Đã hủy', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Hủy phiếu thất bại: ${error.message}`);
  }

  async deleteCheck(id: string): Promise<void> {
    const { error: itemError } = await this.supabase
      .from('inventory_check_items')
      .delete()
      .eq('inventory_check_id', id);
    if (itemError) throw new Error(`Xóa items thất bại: ${itemError.message}`);

    const { error } = await this.supabase
      .from('inventory_checks')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Xóa phiếu thất bại: ${error.message}`);
  }

  async saveDraft(checkId: string, items: Pick<InventoryCheckItemDTO, 'id' | 'actual_quantity'>[]): Promise<void> {
    for (const item of items) {
      const { error } = await this.supabase
        .from('inventory_check_items')
        .update({
          actual_quantity: item.actual_quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (error) throw new Error(`Lưu tạm item ${item.id} thất bại: ${error.message}`);
    }
    await this.supabase
      .from('inventory_checks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', checkId);
  }
}