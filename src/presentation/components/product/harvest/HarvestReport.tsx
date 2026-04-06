'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Harvest, HarvestStats } from '@/domain/entities/Harvest';
import { HarvestRepository } from '@/infrastructure/supabase/repositories/HarvestRepository';

// --- SVG Icons (Tailwind Optimized) ---
const BarChartIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const ListIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const SearchIcon = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const SettingsIcon = () => <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="m19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;

export const HarvestReport: React.FC<{ onOpenForm?: () => void }> = ({ onOpenForm }) => {
  const repoRef = useRef(new HarvestRepository());
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [stats, setStats] = useState<HarvestStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [view, setView] = useState<'stats' | 'list'>('stats');

  const loadData = useCallback(async () => {
    setLoading(true);
    const filters = {
      harvestFrom: dateFrom || undefined,
      harvestTo: dateTo || undefined,
    };
    try {
      const [harvestData, statsData] = await Promise.all([
        repoRef.current.getHarvests(filters),
        repoRef.current.getHarvestStats(filters),
      ]);
      setHarvests(harvestData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxQty = Math.max(...stats.map((s) => s.total_quantity), 1);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto bg-[#F0F1F3] min-h-full font-['Be_Vietnam_Pro']">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-200">
        <div className="flex items-center bg-white border border-gray-300 rounded w-80 h-[38px] px-3 focus-within:border-[#0055AA]">
          <input className="flex-1 border-none outline-none text-sm p-0 bg-transparent" placeholder="Tìm theo mã phiếu, sản phẩm..." />
          <SettingsIcon />
        </div>
        <button 
          onClick={onOpenForm}
          className="bg-[#0055AA] text-white px-4 py-2 rounded font-bold text-sm hover:bg-[#004488] whitespace-nowrap"
        >
          + Ghi nhận thu hoạch
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Tổng lần thu hoạch', value: harvests.length, unit: 'lần' },
          { label: 'Số loại sản phẩm', value: stats.length, unit: 'loại' },
          { label: 'Tổng số lượng', value: stats.reduce((s, r) => s + r.total_quantity, 0), unit: '' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="text-xs text-gray-500 mb-1.5 font-medium">{card.label}</div>
            <div className="text-2xl font-bold text-[#0055AA]">
              {card.value.toLocaleString('vi-VN')}
              {card.unit && <span className="text-sm font-normal text-gray-500 ml-1.5">{card.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm items-end">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 block mb-1">Từ ngày</label>
          <input 
            type="date" 
            className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#0055AA]" 
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-500 block mb-1">Đến ngày</label>
          <input 
            type="date" 
            className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:border-[#0055AA]" 
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
          />
        </div>
        <button 
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          className="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
        >
          Reset
        </button>
        <div className="flex ml-auto bg-gray-100 p-1 rounded-md">
          <button 
            onClick={() => setView('stats')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${view === 'stats' ? 'bg-white shadow-sm text-[#111827]' : 'text-gray-500'}`}
          >
            <BarChartIcon /> Năng suất
          </button>
          <button 
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${view === 'list' ? 'bg-white shadow-sm text-[#111827]' : 'text-gray-500'}`}
          >
            <ListIcon /> Chi tiết
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {view === 'stats' && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Năng suất theo sản phẩm</h3>
          {loading ? (
            <div className="py-10 text-center text-gray-400 italic">Đang tải dữ liệu năng suất...</div>
          ) : stats.length === 0 ? (
            <div className="py-10 text-center text-gray-400 italic">Chưa có dữ liệu năng suất</div>
          ) : (
            <div className="flex flex-col gap-4">
              {stats.sort((a,b) => b.total_quantity - a.total_quantity).map(s => (
                <div key={s.product_id}>
                  <div className="flex justify-between mb-1.5 text-sm font-medium text-gray-900">
                    <span>{s.product_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#0055AA] rounded-full transition-all duration-700"
                        style={{ width: `${(s.total_quantity / maxQty) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-[#0055AA] min-w-[80px] text-right">
                      {s.total_quantity.toLocaleString()} {s.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List Table View */}
      {(view === 'list' || view === 'stats') && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {view === 'stats' && <div className="p-4 border-b border-gray-100 font-bold text-sm text-gray-800 bg-gray-50/50">Lịch sử thu hoạch gần đây</div>}
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#F9FAFB] border-b border-gray-200 font-bold text-gray-500 uppercase">
              <tr>
                <th className="p-3">Sản phẩm</th>
                <th className="p-3">ĐVT</th>
                <th className="p-3 text-right">Số lượng</th>
                <th className="p-3">Ngày thu hoạch</th>
                <th className="p-3">Người ghi nhận</th>
                <th className="p-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Đang tải lịch sử thu hoạch...</td></tr>
              ) : harvests.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400 text-sm">Không có dữ liệu thu hoạch nào</td></tr>
              ) : harvests.map(h => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium text-gray-900">{h.product_name}</td>
                  <td className="p-3 text-gray-500">{h.unit}</td>
                  <td className="p-3 text-right font-bold text-green-700">{h.quantity.toLocaleString()}</td>
                  <td className="p-3 text-gray-600 font-medium">{new Date(h.harvest_date).toLocaleDateString('vi-VN')}</td>
                  <td className="p-3 text-gray-600">{h.creator}</td>
                  <td className="p-3 text-gray-400 italic font-light">{h.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};