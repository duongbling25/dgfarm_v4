'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { InventoryCheck, InventoryItem, InventoryStatus, InventoryFilter } from '@/domain/entities/Inventory';
import { InventoryRepository } from '@/infrastructure/supabase/repositories/InventoryRepository';

const repo = new InventoryRepository();

const SearchIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
const PlusIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const SettingsIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

// FIX: Helper tính khoảng thời gian cho filter ngày/tuần
function getDateRange(preset: 'today' | 'this_week' | 'all'): { from?: string; to?: string } {
  if (preset === 'all') return {}
  const now = new Date()
  if (preset === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
    return { from, to }
  }
  if (preset === 'this_week') {
    // Tuần bắt đầu từ thứ 2 (Monday)
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    return { from: monday.toISOString(), to: sunday.toISOString() }
  }
  return {}
}

const StatusBadge: React.FC<{ status: InventoryStatus }> = ({ status }) => {
  const styles = {
    'Phiếu tạm': 'bg-orange-100 text-orange-600',
    'Đã cân bằng': 'bg-green-100 text-green-700',
    'Đã hủy': 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
};

const ExpandedDetail: React.FC<{
  check: InventoryCheck;
  onOpenForm: (id: string) => void;
  onCancel: (id: string) => void;
}> = ({ check, onOpenForm, onCancel }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getCheckItems(check.id).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [check.id]);

  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="p-6 border-l-4 border-[#0055AA] bg-white shadow-inner">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 mb-4">
            <h4 className="text-xl font-bold text-gray-800">{check.code}</h4>
            <StatusBadge status={check.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <div className="flex gap-2">
              <span className="text-gray-500">Người tạo:</span>
              <span className="font-medium text-gray-800">{check.creator}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">Ngày tạo:</span>
              <span className="font-medium text-gray-800">{new Date(check.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">Người cân bằng:</span>
              <span className="font-medium text-gray-800">{check.balanced_by || 'Chưa có'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500">Ngày cân bằng:</span>
              <span className="font-medium text-gray-800">{check.balanced_at ? new Date(check.balanced_at).toLocaleDateString('vi-VN') : 'Chưa có'}</span>
            </div>
          </div>

          <div className="border border-gray-200 rounded overflow-hidden mb-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-semibold">Mã hàng</th>
                  <th className="p-2 font-semibold">Tên hàng</th>
                  <th className="p-2 font-semibold text-right">Tồn kho</th>
                  <th className="p-2 font-semibold text-right">Thực tế</th>
                  <th className="p-2 font-semibold text-right">SL lệch</th>
                  <th className="p-2 font-semibold text-right">Giá trị lệch</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-gray-400">Đang tải...</td></tr>
                ) : items.map(it => (
                  <tr key={it.id} className="border-b border-gray-100">
                    <td className="p-2 text-[#0055AA] font-semibold">{it.product_id}</td>
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2 text-right">{it.stock_quantity}</td>
                    <td className="p-2 text-right">{it.actual_quantity}</td>
                    <td className="p-2 text-right font-bold text-red-500">{it.actual_quantity - it.stock_quantity}</td>
                    <td className="p-2 text-right">{((it.actual_quantity - it.stock_quantity) * it.sell_price).toLocaleString('vi-VN')}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex gap-2">
              {check.status === 'Phiếu tạm' && (
                <>
                  <button
                    onClick={() => onOpenForm(check.id)}
                    className="bg-[#0055AA] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[#004488]"
                  >
                    ✎ Mở phiếu
                  </button>
                  <button
                    onClick={() => onCancel(check.id)}
                    className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded font-medium text-sm hover:bg-gray-50"
                  >
                    🗑 Hủy
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1 text-right text-sm">
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Tổng thực tế:</span>
                <span className="font-bold">{check.actual_quantity}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Tổng lệch tăng:</span>
                <span className="font-bold text-green-600">{check.total_increase}</span>
              </div>
              <div className="flex justify-between gap-6">
                <span className="text-gray-500">Tổng lệch giảm:</span>
                <span className="font-bold text-red-600">{check.total_decrease}</span>
              </div>
              <div className="flex justify-between gap-6 pt-2 mt-1 border-t border-gray-200 text-[#0055AA] font-bold text-lg">
                <span>Tổng chênh lệch:</span>
                <span>{check.total_increase - check.total_decrease}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

export const InventoryCheckList: React.FC<{
  currentUser: string;
  onOpenForm: (id?: string) => void
}> = ({ currentUser, onOpenForm }) => {
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Record<InventoryStatus, boolean>>({
    'Phiếu tạm': true,
    'Đã cân bằng': true,
    'Đã hủy': false
  });
  const [searchCode, setSearchCode] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');

  // FIX: datePreset là state thực sự điều khiển filter — không chỉ UI radio
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_week'>('all');

  const loadChecks = useCallback(async () => {
    setLoading(true);
    try {
      // FIX: Tính date range từ preset rồi truyền vào filter
      const dateRange = getDateRange(datePreset);
      const activeStatuses = (Object.keys(statusFilter) as InventoryStatus[]).filter(s => statusFilter[s]);

      const filter: InventoryFilter = {
        searchCode: searchCode || undefined,
        creator: creatorFilter || undefined,
        // FIX: truyền createdFrom/createdTo thực sự (trước đây không có)
        createdFrom: dateRange.from,
        createdTo: dateRange.to,
      };

      // FIX: Lấy tất cả rồi filter status client-side (vì status filter có thể nhiều giá trị)
      const data = await repo.getAllChecks(filter);
      setChecks(data.filter(c => activeStatuses.includes(c.status)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchCode, creatorFilter, datePreset]);

  useEffect(() => { loadChecks(); }, [loadChecks]);

  const handleCancelCheck = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy phiếu kiểm kho này?')) {
      await repo.cancelCheck(id);
      loadChecks();
    }
  };

  const handleNewCheck = async () => {
    try {
      setLoading(true);
      const newCheck = await repo.createCheck({
        creator: currentUser,
        notes: 'Phiếu kiểm kho mới'
      });
      onOpenForm(newCheck.id);
    } catch (err: any) {
      console.error('Lỗi tạo phiếu:', err);
      alert('Không thể tạo phiếu mới: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#F0F1F3]">
      {/* Sidebar Filters */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex-shrink-0 overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Phiếu kiểm kho</h2>

        {/* FIX: Ngày tạo — radio thực sự gọi setDatePreset để trigger reload */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ngày tạo</h3>
          <div className="space-y-2">
            {([
              { value: 'all', label: 'Tất cả' },
              { value: 'today', label: 'Hôm nay' },
              { value: 'this_week', label: 'Tuần này' },
            ] as const).map(opt => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="radio"
                  name="date-filter"
                  value={opt.value}
                  checked={datePreset === opt.value}
                  onChange={() => setDatePreset(opt.value)}
                  className="w-4 h-4 accent-[#0055AA]"
                />
                {opt.label}
                {datePreset === opt.value && opt.value !== 'all' && (
                  <span className="text-xs text-[#0055AA] font-semibold">✓</span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Trạng thái</h3>
          <div className="space-y-2">
            {(Object.keys(statusFilter) as InventoryStatus[]).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statusFilter[s]}
                  onChange={() => setStatusFilter(prev => ({ ...prev, [s]: !prev[s] }))}
                  className="w-4 h-4 accent-[#0055AA]"
                /> {s}
              </label>
            ))}
          </div>
        </div>

        {/* FIX: Người tạo — input thực sự gắn state creatorFilter */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Người tạo</h3>
          <input
            className="w-full p-2 bg-gray-50 border border-gray-300 rounded text-sm outline-none focus:border-[#0055AA]"
            placeholder="Nhập tên người tạo"
            value={creatorFilter}
            onChange={e => setCreatorFilter(e.target.value)}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center bg-white border border-gray-300 rounded w-80 h-[38px] px-3 focus-within:border-[#0055AA]">
            <input
              className="flex-1 border-none outline-none text-sm p-0 bg-transparent"
              placeholder="Theo mã phiếu kiểm"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
            />
            <span className="pl-2 border-l border-gray-200 text-gray-400">
              <SettingsIcon />
            </span>
          </div>
          {/* FIX: Hiển thị badge filter đang active */}
          <div className="flex items-center gap-2">
            {datePreset !== 'all' && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                {datePreset === 'today' ? 'Hôm nay' : 'Tuần này'}
                <button onClick={() => setDatePreset('all')} className="ml-1 hover:text-red-500">×</button>
              </span>
            )}
            <button
              onClick={handleNewCheck}
              className="bg-[#0055AA] text-white px-4 py-2 rounded font-bold text-sm hover:bg-[#004488] whitespace-nowrap flex items-center gap-2"
            >
              <PlusIcon /> Kiểm kho
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 uppercase text-gray-500 font-bold">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" className="accent-[#0055AA]" /></th>
                <th className="p-3">Mã kiểm kho</th>
                <th className="p-3">Ngày tạo</th>
                <th className="p-3">Ngày cân bằng</th>
                <th className="p-3 text-right">SL thực tế</th>
                <th className="p-3 text-right">Tổng chênh lệch</th>
                <th className="p-3 text-right">Lệch tăng</th>
                <th className="p-3 text-right">Lệch giảm</th>
                <th className="p-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400 text-base">Đang tải danh sách phiếu kiểm kho...</td></tr>
              ) : checks.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-gray-400 text-base">Không tìm thấy phiếu nào</td></tr>
              ) : checks.map(c => (
                <React.Fragment key={c.id}>
                  <tr
                    className={`cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${expandedId === c.id ? 'bg-blue-50/30' : ''}`}
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <td className="p-3"><input type="checkbox" className="accent-[#0055AA]" onClick={e => e.stopPropagation()} /></td>
                    <td className="p-3 text-[#0055AA] font-bold">{c.code}</td>
                    <td className="p-3 text-gray-600">{new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3 text-gray-600">{c.balanced_at ? new Date(c.balanced_at).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="p-3 text-right text-gray-800">{c.actual_quantity}</td>
                    <td className="p-3 text-right font-semibold text-gray-800">{(c.total_increase - c.total_decrease).toLocaleString()}đ</td>
                    <td className="p-3 text-right text-green-600 font-bold">{c.total_increase}</td>
                    <td className="p-3 text-right text-red-600 font-bold">{c.total_decrease}</td>
                    <td className="p-3"><StatusBadge status={c.status} /></td>
                  </tr>
                  {expandedId === c.id && (
                    <ExpandedDetail
                      check={c}
                      onOpenForm={onOpenForm}
                      onCancel={handleCancelCheck}
                    />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};