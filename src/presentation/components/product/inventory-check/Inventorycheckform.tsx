'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InventoryCheck, InventoryItem } from '@/domain/entities/Inventory';
import { InventoryRepository } from '@/infrastructure/supabase/repositories/InventoryRepository';
import { AdjustStockUseCase } from '@/application/use-cases/inventory/AdjustStockUseCase';
import { useDebounce } from '@/presentation/hooks/useDebounce';

const repo = new InventoryRepository();
const adjustStockUseCase = new AdjustStockUseCase(repo);

// --- SVG Icons (Tailwind Optimized) ---
const BackIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const SearchIcon = () => <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const SaveIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const CheckIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>;

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
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [checkData, itemsData] = await Promise.all([
        repo.getCheckById(checkId),
        repo.getCheckItems(checkId),
      ]);
      setCheck(checkData);
      setItems(itemsData || []);
    } catch (err: any) {
      showToast(err.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }, [checkId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Product Search Effect
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      repo.searchProducts(debouncedSearchTerm).then(setSearchResults);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchTerm]);

  const handleSelectProduct = async (product: any) => {
    setShowResults(false);
    setSearchTerm('');

    // Duplicate Prevention
    const existing = items.find(it => it.product_id === product.id);
    if (existing) {
      setDuplicateId(existing.id);
      itemRefs.current[existing.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setDuplicateId(null), 2000);
      return;
    }

    // Add row - Optimistic UI (but with real ID from DB to ensure RPC works)
    try {
      const newItem = await repo.addItem({
        inventory_check_id: checkId,
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        stock_quantity: product.stock,
        sell_price: product.sell_price,
      });
      setItems(prev => [...prev, newItem]);
    } catch (err: any) {
      showToast(err.message || 'Lỗi thêm sản phẩm', 'error');
    }
  };

  const handleActualChange = (itemId: string, value: string) => {
    const val = parseInt(value) || 0;
    // Optimistic UI Update
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, actual_quantity: val } : item
      )
    );
    // Background Draft Save
    repo.saveDraft(checkId, [{ id: itemId, actual_quantity: val }]).catch(console.error);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await repo.saveDraft(checkId, items.map(i => ({ id: i.id, actual_quantity: i.actual_quantity })));
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
        items: items.map(item => ({
          ...item,
          diff_quantity: item.actual_quantity - item.stock_quantity,
          diff_value: (item.actual_quantity - item.stock_quantity) * item.sell_price,
        })),
        balanced_by: currentUser,
      });
      if (result.success) {
        showToast('Cân bằng kho thành công!', 'success');
        setTimeout(() => onComplete(), 1200);
      } else {
        showToast(result.error || 'Cân bằng thất bại', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi hệ thống khi cân bằng', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const totalActual = items.reduce((s, i) => s + (i.actual_quantity || 0), 0);
  const totalIncrease = items
    .filter(i => (i.actual_quantity || 0) > i.stock_quantity)
    .reduce((s, i) => s + ((i.actual_quantity || 0) - i.stock_quantity), 0);
  const totalDecrease = items
    .filter(i => (i.actual_quantity || 0) < i.stock_quantity)
    .reduce((s, i) => s + (i.stock_quantity - (i.actual_quantity || 0)), 0);

  if (loading) return <div className="flex h-screen items-center justify-center text-gray-500">Đang tải...</div>;
  if (!check) return <div className="p-6 text-red-600">Không tìm thấy phiếu kiểm kho.</div>;

  const isEditable = check.status === 'Phiếu tạm';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] font-['Inter',_sans-serif] text-[#1E293B]">
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded shadow-lg font-bold text-sm ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <header className="flex h-12 shrink-0 items-center gap-4 bg-white px-4 border-b border-gray-200">
        <button onClick={onBack} className="text-gray-500 hover:bg-gray-100 p-1 rounded">
          <BackIcon />
        </button>
        <h2 className="text-lg font-bold text-gray-800">Kiểm kho</h2>
        
        {/* Search Bar */}
        <div className="relative ml-auto w-[400px]">
          <div className="flex h-9 items-center bg-white border border-gray-300 rounded px-3 focus-within:border-[#0055AA]">
            <input 
              className="flex-1 border-none outline-none text-sm p-0 bg-transparent" 
              placeholder="Tìm hàng hóa theo mã hoặc tên (F3)" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
            <SearchIcon />
          </div>
          
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded z-50 max-h-80 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">Không tìm thấy sản phẩm</div>
              ) : searchResults.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectProduct(p)}
                  className="flex items-center justify-between p-3 border-b border-slate-50 hover:bg-emerald-50 cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-[#0055AA]">{p.barcode || p.id}</span>
                    <span className="text-sm text-slate-700">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Tồn: <span className="font-bold text-slate-900">{p.stock}</span> {p.unit || 'đv'}</div>
                    <div className="text-sm font-bold text-emerald-600">{p.sell_price.toLocaleString()}đ</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <button className="flex h-9 w-9 items-center justify-center border border-gray-300 rounded bg-white text-gray-500">↕</button>
          <button className="flex h-9 w-9 items-center justify-center border border-gray-300 rounded bg-white text-gray-500">⊞</button>
          <button className="flex h-9 w-9 items-center justify-center border border-[#0EA5E9] rounded bg-[#0EA5E9] text-white">+</button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-white">
          <nav className="flex px-4 border-b border-gray-200 shrink-0">
            <div className="px-4 py-3 border-b-2 border-[#0055AA] text-[#0055AA] text-sm font-bold cursor-pointer">Tất cả ({items.length})</div>
            <div className="px-4 py-3 text-gray-500 text-sm font-medium cursor-pointer hover:bg-gray-50">Lệch ({items.filter(i => (i.actual_quantity||0) !== i.stock_quantity).length})</div>
            <div className="px-4 py-3 text-gray-500 text-sm font-medium cursor-pointer hover:bg-gray-50">Khớp ({items.filter(i => (i.actual_quantity||0) === i.stock_quantity).length})</div>
          </nav>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b-2 border-slate-200 uppercase font-bold text-[#475569]">
                <tr>
                  <th className="p-4 w-10 text-center text-[11px] tracking-wider">STT</th>
                  <th className="p-4 text-[11px] tracking-wider">Mã hàng</th>
                  <th className="p-4 text-[11px] tracking-wider">Tên hàng</th>
                  <th className="p-4 text-[11px] tracking-wider">ĐVT</th>
                  <th className="p-4 text-right text-[11px] tracking-wider">Tồn kho</th>
                  <th className="p-4 text-right w-32 text-[11px] tracking-wider">Thực tế</th>
                  <th className="p-4 text-right text-[11px] tracking-wider">SL lệch</th>
                  <th className="p-4 text-right text-[11px] tracking-wider">Giá trị lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center text-gray-400 text-sm italic">Sử dụng thanh tìm kiếm để thêm sản phẩm vào phiếu kiểm</td></tr>
                ) : items.map((it, idx) => {
                  const diff = (it.actual_quantity || 0) - it.stock_quantity;
                  const diffValue = diff * it.sell_price;
                  const isDuplicate = duplicateId === it.id;
                  
                  return (
                    <tr 
                      key={it.id} 
                      ref={el => { itemRefs.current[it.id] = el; }}
                      className={`transition-colors duration-300 ${isDuplicate ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                    >
                      <td className="p-3 text-gray-400 text-center">{idx + 1}</td>
                      <td className="p-3 font-bold text-[#0055AA]">{it.barcode || it.product_id}</td>
                      <td className="p-3">{it.product_name}</td>
                      <td className="p-3 text-[#0055AA] font-semibold">{it.unit}</td>
                      <td className="p-3 text-right font-medium">{it.stock_quantity}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number"
                            value={it.actual_quantity || ''}
                            onChange={e => handleActualChange(it.id, e.target.value)}
                            className="w-24 p-2 border-2 border-emerald-100 rounded-md text-right font-extrabold focus:border-[#10B981] outline-none bg-emerald-50 text-emerald-900 transition-all"
                            disabled={!isEditable}
                          />
                          <span className="text-[10px] font-bold text-emerald-600 w-8 text-left">{it.unit || 'đv'}</span>
                        </div>
                      </td>
                      <td className={`p-3 text-right font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {diff > 0 ? `+${diff}` : diff === 0 ? '0' : diff}
                      </td>
                      <td className={`p-3 text-right font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {diffValue.toLocaleString()}đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="w-80 shrink-0 bg-[#F0F1F3] flex flex-col p-4 gap-4 overflow-y-auto border-l border-gray-300">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <span>👤</span> {currentUser}
            </div>
            <div className="text-gray-500 bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium">
              {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Mã kiểm kho</span>
            <input className="w-36 p-1.5 bg-gray-100 border border-gray-300 rounded text-right text-gray-400 outline-none" value={check.code} readOnly />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Trạng thái</span>
            <span className="font-bold text-orange-600">{check.status}</span>
          </div>

          <div className="flex justify-between items-center border-t border-gray-200 pt-4">
            <span className="text-gray-700 font-bold">Tổng SL thực tế</span>
            <span className="text-2xl font-bold text-gray-800">{totalActual}</span>
          </div>

          <textarea className="w-full p-2 border border-gray-300 rounded text-sm min-h-[60px] outline-none focus:border-[#0055AA]" placeholder="✏ Ghi chú"></textarea>

          <div className="mt-4 bg-white border border-gray-300 rounded overflow-hidden">
            <div className="bg-[#E6EFF7] p-2 text-sm font-bold text-gray-800 border-b border-gray-300">Phiếu kiểm gần đây</div>
            <div className="p-2 space-y-2 max-h-40 overflow-y-auto">
              <div className="text-xs text-gray-600 pb-2 border-b border-gray-50">📋 SP000062 – 27/10/2024</div>
              <div className="text-xs text-gray-600 pb-2 border-b border-gray-50">📋 SP000045 – 26/10/2024</div>
              <div className="text-xs text-gray-600">📋 SP000031 – 25/10/2024</div>
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <button 
              disabled={saving || !isEditable}
              onClick={handleSaveDraft}
              className="flex-1 py-3 bg-[#0055AA] text-white rounded font-bold hover:bg-[#004488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <SaveIcon /> {saving ? 'Đang lưu...' : 'Lưu tạm'}
            </button>
            <button 
              disabled={completing || !isEditable || items.length === 0}
              onClick={handleComplete}
              className="flex-1 py-3 bg-[#008B00] text-white rounded font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckIcon /> {completing ? 'Xử lý...' : 'Hoàn thành'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};