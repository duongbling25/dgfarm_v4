'use client'

// ============================================================
// PRESENTATION LAYER - InventoryCheckForm.tsx
// Nhiệm vụ: Form nhập số lượng thực tế khi kiểm kho.
//   - "Lưu tạm": gọi repo.saveDraft() – chỉ lưu actual_quantity
//   - "Hoàn thành": gọi AdjustStockUseCase – cân bằng thật sự
// KHÔNG tự cập nhật stock, KHÔNG tự tính diff để lưu DB.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { InventoryCheck, InventoryItem } from '@/domain/entities/Inventory';
import { InventoryRepository } from '@/infrastructure/supabase/repositories/InventoryRepository';
import { AdjustStockUseCase } from '@/application/use-cases/inventory/AdjustStockUseCase';

const repo = new InventoryRepository();
const adjustStockUseCase = new AdjustStockUseCase(); // ✅ Inject repo vào UseCase

// ─── SVG Icons ────────────────────────────────────────────
const BackIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const SaveIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;

interface InventoryCheckFormProps {
  checkId: string;
  currentUser: string;
  onComplete: () => void;
  onBack: () => void;
}

export const InventoryCheckForm: React.FC<InventoryCheckFormProps> = ({
  checkId, currentUser, onComplete, onBack,
}) => {
  const [check, setCheck] = useState<InventoryCheck | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [checkData, itemsData] = await Promise.all([
      repo.getCheckById(checkId),
      repo.getCheckItems(checkId),
    ]);
    setCheck(checkData);
    setItems(itemsData);
    setLoading(false);
  }, [checkId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleActualChange = (itemId: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, actual_quantity: parseInt(value) || 0 } : item
      )
    );
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await repo.saveDraft(checkId, items.map((i) => ({ id: i.id, actual_quantity: i.actual_quantity })));
      showToast('Đã lưu tạm thành công', 'success');
    } catch (err: any) {
      showToast(err.message || 'Lỗi lưu tạm', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Xác nhận cân bằng kho? Hành động này sẽ cập nhật tồn kho thực tế.')) return;
    setCompleting(true);
    try {
      const result = await adjustStockUseCase.execute({
        inventory_check_id: checkId,
        items: items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          unit: item.unit,
          stock_quantity: item.stock_quantity,
          actual_quantity: item.actual_quantity,
          diff_quantity: 0,
          sell_price: item.sell_price,
          diff_value: 0,
        })),
        balanced_by: currentUser,
      });
      if (result.success) {
        showToast('Cân bằng kho thành công!', 'success');
        setTimeout(() => onComplete(), 1200);
      } else {
        showToast(result.error || 'Cân bằng thất bại', 'error');
      }
    } finally {
      setCompleting(false);
    }
  };

  const totalIncrease = items
    .filter((i) => i.actual_quantity - i.stock_quantity > 0)
    .reduce((s, i) => s + (i.actual_quantity - i.stock_quantity), 0);
  const totalDecrease = items
    .filter((i) => i.actual_quantity - i.stock_quantity < 0)
    .reduce((s, i) => s + Math.abs(i.actual_quantity - i.stock_quantity), 0);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6B7280' }}>Đang tải...</div>;
  if (!check) return <div style={{ padding: '24px', color: '#B91C1C' }}>Không tìm thấy phiếu kiểm kho.</div>;

  const isEditable = check.status === 'Phiếu tạm';

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif', position: 'relative' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 1000, padding: '12px 20px', borderRadius: '6px', fontWeight: 600, fontSize: '14px', backgroundColor: toast.type === 'success' ? '#D1FAE5' : '#FEE2E2', color: toast.type === 'success' ? '#065F46' : '#991B1B', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.msg}
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
            title="Quay lại"
          >
            <BackIcon />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 }}>{check.code}</h2>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Tạo bởi {check.creator}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <tr>
                  {['STT', 'Mã hàng', 'Tên hàng', 'ĐVT', 'Tồn hệ thống', 'Thực tế (nhập)', 'Lệch SL (preview)', 'Lệch giá trị (preview)'].map((h, i) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: i < 4 ? 'left' : 'right', fontWeight: 600, color: '#374151', fontSize: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>Không có sản phẩm</td></tr>}
                {items.map((item, idx) => {
                  const displayDiff = item.actual_quantity - item.stock_quantity;
                  const displayDiffValue = displayDiff * item.sell_price;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '9px 12px', color: '#9CA3AF', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '9px 12px', color: '#0055AA', fontWeight: 500 }}>{item.product_id}</td>
                      <td style={{ padding: '9px 12px', color: '#111827' }}>{item.product_name}</td>
                      <td style={{ padding: '9px 12px', color: '#6B7280' }}>{item.unit}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>{item.stock_quantity}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                        {isEditable ? (
                          <input type="number" value={item.actual_quantity || ''} onChange={(e) => handleActualChange(item.id, e.target.value)} min={0} style={{ width: '72px', padding: '4px 8px', border: '1px solid #93C5FD', borderRadius: '4px', textAlign: 'right', fontSize: '13px', backgroundColor: '#EFF6FF' }} />
                        ) : (
                          <span>{item.actual_quantity}</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: displayDiff > 0 ? '#15803D' : displayDiff < 0 ? '#B91C1C' : '#9CA3AF' }}>
                        {displayDiff !== 0 ? (displayDiff > 0 ? `+${displayDiff}` : displayDiff) : '—'}
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 600, color: displayDiffValue > 0 ? '#15803D' : displayDiffValue < 0 ? '#B91C1C' : '#9CA3AF' }}>
                        {displayDiffValue !== 0 ? `${displayDiffValue > 0 ? '+' : ''}${displayDiffValue.toLocaleString('vi-VN')}đ` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <aside style={{ width: '260px', backgroundColor: '#fff', borderLeft: '1px solid #E5E7EB', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng quan (preview)</div>
        {[
          { label: 'SL thực tế', value: items.reduce((s, i) => s + i.actual_quantity, 0), color: '#111827' },
          { label: 'Tổng lệch tăng', value: `+${totalIncrease}`, color: '#15803D' },
          { label: 'Tổng lệch giảm', value: `-${totalDecrease}`, color: '#B91C1C' },
        ].map((row) => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>{row.label}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: row.color }}>{row.value}</span>
          </div>
        ))}
        <div style={{ fontSize: '11px', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '4px', padding: '8px 10px' }}>
          ℹ️ Preview chỉ tham khảo. Hệ thống tính lại chính xác khi bấm "Hoàn thành".
        </div>
        {isEditable && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            <button 
              onClick={handleSaveDraft} 
              disabled={saving} 
              style={{ padding: '10px', backgroundColor: '#fff', color: '#0055AA', border: '2px solid #0055AA', borderRadius: '4px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <SaveIcon /> {saving ? 'Đang lưu...' : 'Lưu tạm'}
            </button>
            <button 
              onClick={handleComplete} 
              disabled={completing} 
              style={{ padding: '10px', backgroundColor: '#008B00', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: completing ? 'not-allowed' : 'pointer', opacity: completing ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <CheckIcon /> {completing ? 'Đang xử lý...' : 'Hoàn thành – Cân bằng kho'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};