'use client'

// ============================================================
// PRESENTATION LAYER - HarvestManager.tsx
// Nhiệm vụ: Form nhập liệu Ghi nhận Thu hoạch.
//   - Cho phép chọn sản phẩm, nhập khối lượng, chọn ngày, ghi chú
//   - Hiển thị trạng thái "Đang xử lý" khi lưu
//   - Gọi RecordHarvestUseCase khi submit (KHÔNG tự cập nhật stock)
//   - Hiển thị thông báo thành công/thất bại
// KHÔNG tự cộng stock, KHÔNG gọi Supabase trực tiếp.
// ============================================================

import React, { useState, useEffect } from 'react';
import { HarvestRepository } from '@/infrastructure/supabase/repositories/HarvestRepository'
import { RecordHarvestUseCase } from '@/application/use-cases/harvest/RecordHarvestUseCase';

const harvestRepo = new HarvestRepository();
const recordHarvestUseCase = new RecordHarvestUseCase();

// ─── SVG Icons ────────────────────────────────────────────
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;
const SpinnerIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>;

interface HarvestManagerProps {
  currentUser: string;
  onSuccess?: () => void;
}

export const HarvestManager: React.FC<HarvestManagerProps> = ({ currentUser, onSuccess }) => {
  const [products, setProducts] = useState<Array<{ id: string; name: string; stock: number; unit: string }>>([]);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    harvest_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastResult, setLastResult] = useState<{ productName: string; quantity: number; newStock: number } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    harvestRepo.getAvailableProducts().then((data) => {
      setProducts(data);
      setLoadingProducts(false);
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === form.product_id);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Giao toàn bộ logic cho UseCase: validate, tính stock mới, lưu DB
      const result = await recordHarvestUseCase.execute(
        {
          product_id: form.product_id,
          quantity: parseInt(form.quantity),
          harvest_date: form.harvest_date,
          notes: form.notes,
        },
        currentUser
      );

      if (result.success) {
        setLastResult({
          productName: selectedProduct?.name || '',
          quantity: parseInt(form.quantity),
          newStock: result.newStock || 0,
        });
        showToast('Ghi nhận thu hoạch thành công!', 'success');
        setForm({ product_id: '', quantity: '', harvest_date: new Date().toISOString().split('T')[0], notes: '' });
        onSuccess?.();
      } else {
        showToast(result.error || 'Có lỗi xảy ra', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.product_id && parseInt(form.quantity) > 0 && form.harvest_date;

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      maxWidth: '560px',
      fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
      position: 'relative',
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '14px',
          whiteSpace: 'nowrap',
          backgroundColor: toast.type === 'success' ? '#D1FAE5' : toast.type === 'error' ? '#FEE2E2' : '#EFF6FF',
          color: toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#991B1B' : '#1E40AF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toast.msg}
        </div>
      )}

      <h2 style={{
        fontSize: '20px',
        fontWeight: 700,
        color: '#111827',
        marginBottom: '24px',
        margin: 0,
      }}>
        Ghi nhận thu hoạch
      </h2>

      {/* Last result banner */}
      {lastResult && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '6px',
          marginBottom: '20px',
          marginTop: '16px',
          fontSize: '13px',
          color: '#15803D',
          fontWeight: 500,
        }}>
          ✓ Đã ghi nhận <strong>{lastResult.quantity} {selectedProduct?.unit}</strong> {lastResult.productName} — tồn kho mới: <strong>{lastResult.newStock}</strong>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Chọn sản phẩm */}
        <div>
          <label style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            display: 'block',
            marginBottom: '6px',
          }}>
            Sản phẩm <span style={{ color: '#EF4444' }}>*</span>
          </label>
          {loadingProducts ? (
            <div style={{ color: '#9CA3AF', fontSize: '13px', padding: '9px 12px' }}>
              Đang tải danh sách...
            </div>
          ) : (
            <select
              value={form.product_id}
              onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: form.product_id ? '1px solid #D1D5DB' : '1px solid #FCA5A5',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#fff',
                fontFamily: 'inherit',
                cursor: 'pointer',
                color: '#333',
              }}
            >
              <option value="">— Chọn sản phẩm —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · Tồn: {p.stock} {p.unit}
                </option>
              ))}
            </select>
          )}
          {selectedProduct && (
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '4px',
              padding: '6px 8px',
              backgroundColor: '#F9FAFB',
              borderRadius: '4px',
            }}>
              Tồn kho hiện tại: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong>
            </div>
          )}
        </div>

        {/* Số lượng */}
        <div>
          <label style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            display: 'block',
            marginBottom: '6px',
          }}>
            Số lượng thu hoạch <span style={{ color: '#EF4444' }}>*</span>
            {selectedProduct && <span style={{ fontWeight: 400, color: '#6B7280' }}> ({selectedProduct.unit})</span>}
          </label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            min={1}
            placeholder="Nhập số lượng"
            style={{
              width: '100%',
              padding: '9px 12px',
              border: form.quantity && parseInt(form.quantity) > 0 ? '1px solid #D1D5DB' : '1px solid #FCA5A5',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              backgroundColor: '#fff',
            }}
          />
          {selectedProduct && form.quantity && parseInt(form.quantity) > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#0055AA',
              marginTop: '4px',
              padding: '6px 8px',
              backgroundColor: '#EFF6FF',
              borderRadius: '4px',
            }}>
              Tồn sau thu hoạch: <strong>{selectedProduct.stock + parseInt(form.quantity)} {selectedProduct.unit}</strong>
            </div>
          )}
        </div>

        {/* Ngày thu hoạch */}
        <div>
          <label style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            display: 'block',
            marginBottom: '6px',
          }}>
            Ngày thu hoạch <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="date"
            value={form.harvest_date}
            onChange={(e) => setForm((f) => ({ ...f, harvest_date: e.target.value }))}
            max={new Date().toISOString().split('T')[0]}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '14px',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              backgroundColor: '#fff',
            }}
          />
        </div>

        {/* Ghi chú */}
        <div>
          <label style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            display: 'block',
            marginBottom: '6px',
          }}>
            Ghi chú
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Lô thu hoạch, điều kiện, ghi chú thêm..."
            rows={3}
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              backgroundColor: '#fff',
              color: '#333',
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !isValid}
          style={{
            padding: '12px',
            backgroundColor: isValid ? '#0055AA' : '#D1D5DB',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 700,
            fontSize: '14px',
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          {loading ? (
            <>
              <SpinnerIcon /> Đang xử lý...
            </>
          ) : (
            <>
              <CheckIcon /> Ghi nhận thu hoạch
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};