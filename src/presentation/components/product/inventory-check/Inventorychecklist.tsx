'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { InventoryCheck, InventoryItem, InventoryFilter, InventoryStatus } from '@/domain/entities/Inventory';
import { InventoryRepository } from '@/infrastructure/supabase/repositories/InventoryRepository';

const repo = new InventoryRepository();

// ─── SVG Icons ────────────────────────────────────────────
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChevronDownIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;

// ─── Status Badge ──────────────────────────────────────────
const StatusBadge: React.FC<{ status: InventoryStatus }> = ({ status }) => {
  const config: Record<InventoryStatus, { bg: string; text: string; color: string }> = {
    'Phiếu tạm':   { bg: '#FFF7ED', text: '#C2410C', color: '#FDBA74' },
    'Đã cân bằng': { bg: '#F0FDF4', text: '#15803D', color: '#86EFAC' },
    'Đã hủy':      { bg: '#FEF2F2', text: '#B91C1C', color: '#FCA5A5' },
  };
  const c = config[status];
  return (
    <span style={{
      padding: '3px 10px',
      backgroundColor: c.bg,
      color: c.text,
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      border: `1px solid ${c.color}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

// ─── Expanded Detail Row ──────────────────────────────────
const ExpandedDetail: React.FC<{
  check: InventoryCheck;
  onCancel: (id: string) => void;
  onOpenForm: (id: string) => void;
}> = ({ check, onCancel, onOpenForm }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    repo.getCheckItems(check.id).then((data) => {
      setItems(data);
      setLoadingItems(false);
    });
  }, [check.id]);

  return (
    <tr>
      <td colSpan={10} style={{ padding: 0 }}>
        <div style={{
          borderLeft: '3px solid #0055AA',
          margin: '0 0 0 0',
          padding: '20px 24px',
          backgroundColor: '#F8FAFF',
        }}>
          {/* Header info */}
          <div style={{ display: 'flex', gap: '48px', marginBottom: '16px', fontSize: '13px' }}>
            {[
              { label: 'Người tạo', value: check.creator },
              { label: 'Ngày tạo', value: new Date(check.created_at).toLocaleDateString('vi-VN') },
              { label: 'Người cân bằng', value: check.balanced_by || '—' },
              { label: 'Ngày cân bằng', value: check.balanced_at ? new Date(check.balanced_at).toLocaleDateString('vi-VN') : '—' },
            ].map((info) => (
              <div key={info.label}>
                <div style={{ color: '#6B7280', marginBottom: '2px' }}>{info.label}</div>
                <div style={{ color: '#111827', fontWeight: 500 }}>{info.value}</div>
              </div>
            ))}
          </div>

          {/* Items mini-table */}
          {loadingItems ? (
            <div style={{ color: '#6B7280', fontSize: '13px' }}>Đang tải sản phẩm...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#EFF6FF', borderBottom: '1px solid #BFDBFE' }}>
                  {['Mã hàng', 'Tên hàng', 'ĐVT', 'Tồn kho', 'Thực tế', 'SL lệch', 'Giá trị lệch'].map((h) => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Mã hàng' || h === 'Tên hàng' || h === 'ĐVT' ? 'left' : 'right', fontWeight: 600, color: '#1E40AF' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '7px 10px', color: '#0055AA', fontWeight: 500 }}>{item.product_id}</td>
                    <td style={{ padding: '7px 10px', color: '#111827' }}>{item.product_name}</td>
                    <td style={{ padding: '7px 10px', color: '#6B7280' }}>{item.unit}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#374151' }}>{item.stock_quantity}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#374151' }}>{item.actual_quantity}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: item.diff_quantity > 0 ? '#15803D' : item.diff_quantity < 0 ? '#B91C1C' : '#374151' }}>
                      {item.diff_quantity > 0 ? `+${item.diff_quantity}` : item.diff_quantity}
                    </td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: item.diff_value > 0 ? '#15803D' : item.diff_value < 0 ? '#B91C1C' : '#374151' }}>
                      {item.diff_value.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Summary + Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {check.status === 'Phiếu tạm' && (
                <>
                  <button
                    onClick={() => onOpenForm(check.id)}
                    style={{ padding: '7px 14px', backgroundColor: '#0055AA', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <EditIcon /> Mở phiếu
                  </button>
                  <button
                    onClick={() => onCancel(check.id)}
                    style={{ padding: '7px 14px', backgroundColor: '#fff', color: '#6B7280', border: '1px solid #D1D5DB', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <TrashIcon /> Hủy phiếu
                  </button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                <span style={{ color: '#6B7280' }}>Tổng lệch tăng:</span>
                <span style={{ color: '#15803D', fontWeight: 600 }}>{check.total_increase}</span>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <span style={{ color: '#6B7280' }}>Tổng lệch giảm:</span>
                <span style={{ color: '#B91C1C', fontWeight: 600 }}>{check.total_decrease}</span>
              </div>
              <div style={{ display: 'flex', gap: '24px', paddingTop: '4px', borderTop: '1px solid #E5E7EB', marginTop: '4px' }}>
                <span style={{ color: '#111827', fontWeight: 600 }}>Tổng chênh lệch:</span>
                <span style={{ color: '#0055AA', fontWeight: 700 }}>{check.total_increase - check.total_decrease}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Component ────────────────────────────────────────
interface InventoryCheckListProps {
  onOpenForm?: (checkId: string) => void;
  onCreateNew?: () => void;
}

export const InventoryCheckList: React.FC<InventoryCheckListProps> = ({ onOpenForm, onCreateNew }) => {
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<InventoryFilter>({
    status: undefined,
    searchCode: '',
  });
  const [statusFilter, setStatusFilter] = useState<Record<InventoryStatus, boolean>>({
    'Phiếu tạm': true,
    'Đã cân bằng': true,
    'Đã hủy': false,
  });

  const loadChecks = useCallback(async () => {
    setLoading(true);
    const activeStatuses = (Object.keys(statusFilter) as InventoryStatus[]).filter((s) => statusFilter[s]);
    try {
      const all = await Promise.all(
        activeStatuses.length > 0
          ? activeStatuses.map((s) => repo.getAllChecks({ ...filters, status: s }))
          : [repo.getAllChecks(filters)]
      );
      const merged = all.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setChecks(merged);
    } finally {
      setLoading(false);
    }
  }, [filters, statusFilter]);

  useEffect(() => { loadChecks(); }, [loadChecks]);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Hủy phiếu kiểm kho này?')) return;
    await repo.cancelCheck(id);
    loadChecks();
  };

  const toggleStatus = (status: InventoryStatus) => {
    setStatusFilter((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', backgroundColor: '#fff', borderRight: '1px solid #E5E7EB', padding: '20px 16px', overflowY: 'auto', flexShrink: 0 }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>Phiếu kiểm kho</h2>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Trạng thái</div>
          {(Object.keys(statusFilter) as InventoryStatus[]).map((status) => (
            <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={statusFilter[status]}
                onChange={() => toggleStatus(status)}
                style={{ width: '15px', height: '15px', accentColor: '#0055AA' }}
              />
              {status}
            </label>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Người tạo</div>
          <input
            type="text"
            placeholder="Tìm người tạo..."
            value={filters.creator || ''}
            onChange={(e) => setFilters((f) => ({ ...f, creator: e.target.value }))}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã phiếu kiểm..."
              value={filters.searchCode || ''}
              onChange={(e) => setFilters((f) => ({ ...f, searchCode: e.target.value }))}
              style={{ padding: '8px 14px 8px 32px', border: '1px solid #D1D5DB', borderRadius: '4px', fontSize: '14px', width: '100%', backgroundColor: '#fff', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={onCreateNew}
            style={{ padding: '8px 18px', backgroundColor: '#0055AA', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <PlusIcon /> Tạo phiếu kiểm
          </button>
        </div>

        {/* Table */}
        <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>Đang tải...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                <tr>
                  {['Mã kiểm kho', 'Ngày tạo', 'Người tạo', 'Ngày cân bằng', 'SL thực tế', 'Lệch tăng', 'Lệch giảm', 'Trạng thái'].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: ['SL thực tế', 'Lệch tăng', 'Lệch giảm'].includes(h) ? 'right' : 'left', fontWeight: 600, color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checks.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>Không có phiếu nào</td>
                  </tr>
                )}
                {checks.map((check) => (
                  <React.Fragment key={check.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === check.id ? null : check.id)}
                      style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', backgroundColor: expandedId === check.id ? '#EFF6FF' : '#fff', transition: 'background 0.1s' }}
                    >
                      <td style={{ padding: '10px 12px', color: '#0055AA', fontWeight: 600 }}>{check.code}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{new Date(check.created_at).toLocaleDateString('vi-VN')}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{check.creator}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{check.balanced_at ? new Date(check.balanced_at).toLocaleDateString('vi-VN') : '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#374151' }}>{check.actual_quantity}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803D', fontWeight: 600 }}>{check.total_increase || 0}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#B91C1C', fontWeight: 600 }}>{check.total_decrease || 0}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={check.status} /></td>
                    </tr>
                    {expandedId === check.id && (
                      <ExpandedDetail
                        check={check}
                        onCancel={handleCancel}
                        onOpenForm={(id) => onOpenForm?.(id)}
                      />
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};