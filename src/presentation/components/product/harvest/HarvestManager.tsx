'use client'

import React, { useState, useEffect } from 'react';
import { HarvestRepository } from '@/infrastructure/supabase/repositories/HarvestRepository'
import { RecordHarvestUseCase } from '@/application/use-cases/harvest/RecordHarvestUseCase';
import { useDebounce } from '@/presentation/hooks/useDebounce';

const harvestRepo = new HarvestRepository();
const recordHarvestUseCase = new RecordHarvestUseCase();

// --- SVG Icons ---
const CheckIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
const SaveIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const SearchIcon = () => <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
const BackIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;

interface HarvestManagerProps {
  currentUser: string;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const HarvestManager: React.FC<HarvestManagerProps> = ({ currentUser, onSuccess, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [harvestItems, setHarvestItems] = useState<any[]>([]);
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      harvestRepo.searchProducts(debouncedSearchTerm).then(setSearchResults);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearchTerm]);

  const handleSelectProduct = (product: any) => {
    setHarvestItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // If product already exists, increment quantity
        return prev.map(item =>
          item.id === product.id ? { ...item, harvest_quantity: (item.harvest_quantity || 0) + 1 } : item
        );
      }
      // Add new item with default quantity 1
      return [...prev, { ...product, harvest_quantity: 1 }];
    });
    setShowResults(false);
    setSearchTerm('');
  };

  const updateItemQuantity = (id: string, qty: string) => {
    const val = parseInt(qty) || 0;
    setHarvestItems(prev => prev.map(item => item.id === id ? { ...item, harvest_quantity: val } : item));
  };

  const removeItem = (id: string) => {
    setHarvestItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (complete: boolean) => {
    if (harvestItems.length === 0) return;

    setLoading(true);
    try {
      const result = await recordHarvestUseCase.executeBulk(
        harvestItems,
        harvestDate,
        notes,
        currentUser
      );

      if (result.success) {
        showToast('Ghi nhận tất cả thu hoạch thành công!', 'success');
        if (complete) {
          setTimeout(() => onSuccess?.(), 1000);
        } else {
          setHarvestItems([]);
          setNotes('');
        }
      } else {
        showToast(result.error || 'Có lỗi xảy ra khi ghi nhận thu hoạch', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden font-['Inter',_sans-serif] text-[#1E293B]">
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded shadow-lg font-bold text-sm ${toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <header className="flex h-12 shrink-0 items-center gap-4 bg-[#F9FAFB] px-4 border-b border-gray-200">
        <button onClick={onBack} className="text-gray-500 hover:bg-gray-200 p-1 rounded">
          <BackIcon />
        </button>
        <h2 className="text-lg font-bold text-gray-700">Thu hoạch</h2>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="p-4 bg-[#F9FAFB] border-b border-gray-200">
            <div className="relative max-w-xl">
              <div className="flex h-10 items-center bg-white border border-gray-300 rounded px-3 focus-within:border-[#0055AA]">
                <SearchIcon />
                <span className="ml-2 bg-[#DCFCE7] text-[#15803D] rounded px-1.5 py-0.5 text-xs font-medium mr-2">SP</span>
                <input
                  className="flex-1 border-none outline-none text-sm p-0 bg-transparent"
                  placeholder="Tìm hàng hóa theo mã hoặc tên"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="text-gray-400 text-lg cursor-pointer">✕ ⊕</span>
              </div>

              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded z-50 max-h-80 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">Không tìm thấy hàng hóa</div>
                  ) : searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="flex items-center justify-between p-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-[#0055AA]">{p.barcode || p.id}</span>
                        <span className="text-sm text-gray-700">{p.name}</span>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        Tồn: <span className="font-bold text-slate-900">{p.stock}</span> {p.unit || 'đv'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b-2 border-slate-200 uppercase font-bold text-[#475569]">
                <tr>
                  <th className="p-4 w-10 text-center text-[11px] tracking-wider"></th>
                  <th className="p-4 w-12 text-center text-slate-400 text-[11px] tracking-wider">STT</th>
                  <th className="p-4 text-[11px] tracking-wider">Mã hàng</th>
                  <th className="p-4 text-[11px] tracking-wider">Tên hàng</th>
                  <th className="p-4 w-20 text-[11px] tracking-wider">ĐVT</th>
                  <th className="p-4 w-24 text-right text-[11px] tracking-wider">Tồn kho</th>
                  <th className="p-4 w-32 text-right text-[11px] tracking-wider">Số lượng TH</th>
                  <th className="p-4 w-20 text-center text-[11px] tracking-wider">ĐVT</th>
                  <th className="p-4 w-24 text-right text-[11px] tracking-wider">Ghi chú</th>
                  <th className="p-4 w-32 text-right text-[11px] tracking-wider">Ngày thu hoạch</th>
                  <th className="p-4 w-10 text-[11px] tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {harvestItems.length === 0 ? (
                  <tr><td colSpan={11} className="p-20 text-center text-gray-400 text-sm italic">Vui lòng tìm và chọn sản phẩm để ghi nhận thu hoạch</td></tr>
                ) : harvestItems.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-100 align-middle hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-center"><input type="checkbox" className="accent-[#0055AA]" /></td>
                    <td className="p-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="p-2 font-bold text-[#0055AA]">{item.barcode || item.id}</td>
                    <td className="p-2">
                      <div className="font-medium text-gray-800">{item.name}</div>
                    </td>
                    <td className="p-2">
                      <span className="bg-[#DCFCE7] text-[#15803D] rounded px-1.5 py-0.5 text-[11px] font-bold uppercase">{item.unit || '-'}</span>
                    </td>
                    <td className="p-2 text-right text-[#0055AA] font-bold">{item.stock}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          value={item.harvest_quantity}
                          onChange={e => updateItemQuantity(item.id, e.target.value)}
                          className="w-24 border-2 border-[#10B981] rounded-md outline-none text-right text-base font-extrabold py-1.5 px-2 bg-emerald-50 text-emerald-900 focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                        <span className="text-sm font-bold text-emerald-600">{item.unit || 'đv'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                       <span className="bg-[#DCFCE7] text-[#15803D] rounded-full px-3 py-1 text-xs font-bold uppercase">{item.unit || '-'}</span>
                    </td>
                    <td className="p-4 text-right text-slate-400">—</td>
                    <td className="p-2 text-right text-gray-700">{harvestDate}</td>
                    <td className="p-2 text-center text-gray-300 cursor-pointer hover:text-red-500" onClick={() => removeItem(item.id)}>✕</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aside / Sidebar */}
        <aside className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-gray-100 text-sm">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span className="text-lg">👤</span> {currentUser}
            </div>
            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Mã phiếu thu hoạch</span>
              <span className="text-gray-300 italic">Mã phiếu tự động</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Trạng thái</span>
              <span className="font-medium text-gray-700">Phiếu tạm</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-start text-sm">
                <span className="text-gray-500 mt-1">Ngày thu hoạch</span>
                <div className="w-40 flex flex-col items-end">
                  <label className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-1 pointer-events-none">
                    <input type="checkbox" className="w-3.5 h-3.5 border-gray-300 rounded" /> In phiếu
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded p-1.5 text-sm text-gray-700 focus:border-[#0055AA] outline-none"
                    value={harvestDate}
                    onChange={e => setHarvestDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-2">
              <span className="text-sm font-bold text-gray-500">Tổng SL thu hoạch</span>
              <span className="text-2xl font-bold text-gray-800">
                {harvestItems.reduce((acc, item) => acc + (item.harvest_quantity || 0), 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Tổng giá trị</span>
              <span className="text-sm font-medium text-gray-700">
                {harvestItems.reduce((acc, item) => acc + ((item.harvest_quantity || 0) * item.sell_price), 0).toLocaleString()} đ
              </span>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                <span className="text-[10px]">✏</span> Ghi chú
              </label>
              <textarea
                className="w-full h-24 p-2.5 border border-gray-200 rounded text-sm text-gray-500 outline-none focus:border-[#0055AA] resize-none"
                placeholder="Ghi chú..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-3">
              <button
                disabled={loading || harvestItems.length === 0}
                onClick={() => handleSubmit(false)}
                className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#0070B8] text-white py-2.5 rounded font-bold text-sm hover:bg-[#005fa0] transition-colors disabled:opacity-50"
              >
                <SaveIcon />
                <span>Lưu tạm</span>
              </button>
              <button
                disabled={loading || harvestItems.length === 0}
                onClick={() => handleSubmit(true)}
                className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#28A745] text-white py-2.5 rounded font-bold text-sm hover:bg-[#218838] transition-colors disabled:opacity-50"
              >
                <CheckIcon />
                <span>Hoàn thành</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};