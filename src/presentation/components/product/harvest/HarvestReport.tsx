'use client'

// ============================================================
// PRESENTATION LAYER - HarvestReport.tsx
// Nhiệm vụ: Hiển thị báo cáo và biểu đồ thu hoạch.
//   - Hiển thị danh sách bản ghi thu hoạch với filter thời gian
//   - Hiển thị tổng hợp năng suất theo sản phẩm
//   - Gọi HarvestRepository để lấy dữ liệu (KHÔNG qua UseCase vì đây là READ)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Harvest, HarvestStats } from '@/domain/entities/Harvest';
import { HarvestRepository } from '@/infrastructure/supabase/repositories/HarvestRepository';

// ─── SVG Icons ────────────────────────────────────────────
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const BarChartIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const ListIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

// ─── Mini bar chart component ─────────────────────────────
const MiniBar: React.FC<{ value: number; max: number; unit: string }> = ({ value, max, unit }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ flex: 1, height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{
        width: `${max > 0 ? (value / max) * 100 : 0}%`,
        height: '100%',
        backgroundColor: '#0055AA',
        borderRadius: '4px',
        transition: 'width 0.5s ease',
      }} />
    </div>
    <span style={{
      fontSize: '13px',
      fontWeight: 600,
      color: '#0055AA',
      minWidth: '60px',
      textAlign: 'right',
    }}>
      {value.toLocaleString('vi-VN')} {unit}
    </span>
  </div>
);

// ─── Main Component ────────────────────────────────────────
export const HarvestReport: React.FC = () => {
  // ✅ Khởi tạo repo một lần bên trong component
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
    const [harvestData, statsData] = await Promise.all([
      repoRef.current.getHarvests(filters),
      repoRef.current.getHarvestStats(filters),
    ]);
    setHarvests(harvestData);
    setStats(statsData);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxQty = Math.max(...stats.map((s) => s.total_quantity), 1);

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#F3F4F6',
      minHeight: '100vh',
      fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
          }}>
            Báo cáo thu hoạch
          </h1>
          <div style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: '#E5E7EB',
            borderRadius: '6px',
            padding: '3px',
          }}>
            {(['stats', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: view === v ? '#fff' : 'transparent',
                  color: view === v ? '#111827' : '#6B7280',
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'inherit',
                }}
              >
                {v === 'stats' ? (
                  <><BarChartIcon /> Tổng hợp</>
                ) : (
                  <><ListIcon /> Chi tiết</>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Date Filter */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          backgroundColor: '#fff',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #E5E7EB',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#6B7280', marginBottom: '-2px', display: 'flex', alignItems: 'center' }}>
            <FilterIcon />
          </span>
          {[
            { label: 'Từ ngày', value: dateFrom, onChange: setDateFrom },
            { label: 'Đến ngày', value: dateTo, onChange: setDateTo },
          ].map((field) => (
            <div key={field.label} style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#6B7280',
                display: 'block',
                marginBottom: '4px',
              }}>
                {field.label}
              </label>
              <input
                type="date"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  backgroundColor: '#fff',
                  color: '#333',
                }}
              />
            </div>
          ))}
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            style={{
              padding: '7px 14px',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
              color: '#374151',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            🔄 Reset
          </button>
        </div>

        {loading ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#9CA3AF',
          }}>
            Đang tải dữ liệu...
          </div>
        ) : (
          <>
            {/* Stats View */}
            {view === 'stats' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Summary cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}>
                  {[
                    { label: 'Tổng lần thu hoạch', value: harvests.length, unit: 'lần' },
                    { label: 'Số sản phẩm', value: stats.length, unit: 'loại' },
                    { label: 'Tổng số lượng', value: stats.reduce((s, r) => s + r.total_quantity, 0), unit: '' },
                  ].map((card) => (
                    <div key={card.label} style={{
                      backgroundColor: '#fff',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      padding: '16px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B7280',
                        marginBottom: '6px',
                        fontWeight: 500,
                      }}>
                        {card.label}
                      </div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#0055AA',
                      }}>
                        {card.value.toLocaleString('vi-VN')}
                        {card.unit && <span style={{
                          fontSize: '14px',
                          fontWeight: 400,
                          color: '#6B7280',
                          marginLeft: '6px',
                        }}>
                          {card.unit}
                        </span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Per-product breakdown */}
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  padding: '20px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}>
                  <h3 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '16px',
                    margin: 0,
                  }}>
                    Năng suất theo sản phẩm
                  </h3>
                  {stats.length === 0 ? (
                    <div style={{
                      color: '#9CA3AF',
                      fontSize: '13px',
                      padding: '24px 0',
                      textAlign: 'center',
                    }}>
                      Chưa có dữ liệu thu hoạch
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {stats
                        .sort((a, b) => b.total_quantity - a.total_quantity)
                        .map((stat) => (
                          <div key={stat.product_id}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '6px',
                              alignItems: 'center',
                            }}>
                              <span style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#111827',
                              }}>
                                {stat.product_name}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                color: '#6B7280',
                              }}>
                                {new Date(stat.first_harvest).toLocaleDateString('vi-VN')} – {new Date(stat.last_harvest).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <MiniBar value={stat.total_quantity} max={maxQty} unit={stat.unit} />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* List View */}
            {view === 'list' && (
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}>
                  <thead style={{
                    backgroundColor: '#F9FAFB',
                    borderBottom: '2px solid #E5E7EB',
                  }}>
                    <tr>
                      {['Sản phẩm', 'ĐVT', 'Số lượng', 'Ngày thu hoạch', 'Người ghi nhận', 'Ghi chú'].map((h) => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: h === 'Số lượng' ? 'right' : 'left',
                          fontWeight: 700,
                          color: '#374151',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          fontFamily: 'inherit',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {harvests.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{
                          padding: '32px',
                          textAlign: 'center',
                          color: '#9CA3AF',
                        }}>
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      harvests.map((h) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: 500,
                            color: '#111827',
                          }}>
                            {h.product_name}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            color: '#6B7280',
                          }}>
                            {h.unit}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: '#15803D',
                          }}>
                            {h.quantity.toLocaleString('vi-VN')}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            color: '#374151',
                          }}>
                            {new Date(h.harvest_date).toLocaleDateString('vi-VN')}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            color: '#374151',
                          }}>
                            {h.creator}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            color: '#9CA3AF',
                          }}>
                            {h.notes || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};