// src/infrastructure/supabase/repositories/SupabaseCashbookRepository.ts

import { createClient } from '@/infrastructure/supabase/client'
import type {
  IPhieuThuChiRepository,
  ILoaiThuChiRepository,
  ITaiKhoanQuyRepository,
  CashbookFilter,
  PagedResult,
} from '@/domain/repositories/ICashbookRepository'
import type {
  PhieuThuChi, LoaiThuChi, TaiKhoanQuy, TongQuyRow, CashbookKieu,
} from '@/domain/entities/Cashbook'

// ── Phiếu Thu Chi ──────────────────────────────────────────────
export class SupabasePhieuThuChiRepository implements IPhieuThuChiRepository {

  async findAll(filter: CashbookFilter): Promise<PagedResult<PhieuThuChi>> {
    const supabase = await createClient()
    const {
      tai_khoan_quy_id, kieu, trang_thai,
      tu_ngay, den_ngay, tu_khoa, loai_thu_chi_id,
      page = 1, page_size = 20,
    } = filter

    // FIX: Alias khác tên bảng để PostgREST không bị nhầm (loai vs loai_thu_chi)
    let q = supabase
      .from('phieu_thu_chi')
      .select(
        '*, loai:loai_thu_chi_id(id,ten,kieu,hach_toan_kd), tai_khoan:tai_khoan_quy_id(id,ten_tai_khoan,loai)',
        { count: 'exact' }
      )
      .order('thoi_gian', { ascending: false })

    // FIX: Chỉ filter tai_khoan_quy_id khi tab không phải "Tổng quỹ"
    if (tai_khoan_quy_id) q = q.eq('tai_khoan_quy_id', tai_khoan_quy_id)
    if (kieu) q = q.eq('kieu', kieu)
    if (trang_thai) q = q.eq('trang_thai', trang_thai)
    if (tu_ngay) q = q.gte('thoi_gian', tu_ngay)
    if (den_ngay) q = q.lte('thoi_gian', den_ngay + 'T23:59:59')
    if (loai_thu_chi_id) q = q.eq('loai_thu_chi_id', loai_thu_chi_id)
    if (tu_khoa) {
      q = q.or(`ma_phieu.ilike.%${tu_khoa}%,ten_doi_tuong.ilike.%${tu_khoa}%,ghi_chu.ilike.%${tu_khoa}%`)
    }

    const from = (page - 1) * page_size
    q = q.range(from, from + page_size - 1)

    const { data, error, count } = await q
    if (error) throw new Error(error.message)

    // FIX: Map alias 'loai'/'tai_khoan' về field đúng tên entity
    const list = (data ?? []).map((row: any) => ({
      ...row,
      loai_thu_chi: row.loai ?? null,
      tai_khoan_quy: row.tai_khoan ?? null,
    })) as unknown as PhieuThuChi[]

    return { data: list, total: count ?? 0, page, page_size }
  }

  async findById(id: string): Promise<PhieuThuChi | null> {
    const supabase = await createClient()
    // FIX: Đổi từ cashbook_phieu → phieu_thu_chi (bảng đúng trong schema)
    const { data, error } = await supabase
      .from('phieu_thu_chi')
      .select('*, loai:loai_thu_chi_id(id,ten,kieu), tai_khoan:tai_khoan_quy_id(id,ten_tai_khoan,loai)')
      .eq('id', id)
      .single()
    if (error) return null
    return {
      ...data,
      loai_thu_chi: (data as any).loai ?? null,
      tai_khoan_quy: (data as any).tai_khoan ?? null,
    } as unknown as PhieuThuChi
  }

  async create(payload: Omit<PhieuThuChi, 'id' | 'created_at' | 'updated_at'>): Promise<PhieuThuChi> {
    const supabase = await createClient()
    // FIX: Strip joined fields trước khi insert (không thể insert vào join columns)
    const { loai_thu_chi, tai_khoan_quy, ...insertData } = payload as any
    const { data, error } = await supabase
      .from('phieu_thu_chi')
      .insert(insertData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as unknown as PhieuThuChi
  }

  async update(id: string, payload: Partial<PhieuThuChi>): Promise<PhieuThuChi> {
    const supabase = await createClient()
    const { loai_thu_chi, tai_khoan_quy, ...updateData } = payload as any
    const finalData = { ...updateData, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('phieu_thu_chi')
      .update(finalData)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as unknown as PhieuThuChi
  }

  async huy(id: string): Promise<PhieuThuChi> {
    return this.update(id, { trang_thai: 'da_huy' })
  }

  async genMaPhieu(prefix: string): Promise<string> {
    const supabase = await createClient()
    // FIX: Đổi từ cashbook_phieu → phieu_thu_chi
    const { count } = await supabase
      .from('phieu_thu_chi')
      .select('*', { count: 'exact', head: true })
      .like('ma_phieu', `${prefix}%`)
    const seq = (count ?? 0) + 1
    return `${prefix}${String(seq).padStart(6, '0')}`
  }
}

// ── Loại Thu Chi ───────────────────────────────────────────────
export class SupabaseLoaiThuChiRepository implements ILoaiThuChiRepository {

  async findAll(kieu?: CashbookKieu): Promise<LoaiThuChi[]> {
    const supabase = await createClient()
    let q = supabase
      .from('loai_thu_chi')
      .select('*')
      .order('la_he_thong', { ascending: false })
      .order('ten')
    if (kieu) q = q.eq('kieu', kieu)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as LoaiThuChi[]
  }

  async create(payload: Pick<LoaiThuChi, 'ten' | 'mo_ta' | 'kieu' | 'hach_toan_kd'>): Promise<LoaiThuChi> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('loai_thu_chi')
      .insert({ ...payload, la_he_thong: false })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as LoaiThuChi
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('loai_thu_chi')
      .delete()
      .eq('id', id)
      .eq('la_he_thong', false)
    if (error) throw new Error(error.message)
  }
}

// ── Tài Khoản Quỹ ──────────────────────────────────────────────
export class SupabaseTaiKhoanQuyRepository implements ITaiKhoanQuyRepository {

  async findAll(): Promise<TaiKhoanQuy[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tai_khoan_quy')
      .select('*')
      .order('la_mac_dinh', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as TaiKhoanQuy[]
  }

  async findById(id: string): Promise<TaiKhoanQuy | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tai_khoan_quy')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as TaiKhoanQuy
  }

  async create(payload: Omit<TaiKhoanQuy, 'id' | 'created_at' | 'updated_at'>): Promise<TaiKhoanQuy> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tai_khoan_quy')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as TaiKhoanQuy
  }

  async update(id: string, payload: Partial<TaiKhoanQuy>): Promise<TaiKhoanQuy> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('tai_khoan_quy')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as TaiKhoanQuy
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('tai_khoan_quy').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async getTongQuy(): Promise<TongQuyRow[]> {
    const supabase = await createClient()

    // FIX: Không dùng view v_tong_quy (chưa tồn tại). Tính thủ công từ 2 bảng.
    const { data: tkData, error: tkError } = await supabase
      .from('tai_khoan_quy')
      .select('*')
    if (tkError) throw new Error(tkError.message)

    const accounts = (tkData ?? []) as TaiKhoanQuy[]
    if (accounts.length === 0) return []

    const { data: phieuData, error: phieuError } = await supabase
      .from('phieu_thu_chi')
      .select('tai_khoan_quy_id, kieu, gia_tri')
      .eq('trang_thai', 'da_thanh_toan')
      .in('tai_khoan_quy_id', accounts.map(a => a.id))
    if (phieuError) throw new Error(phieuError.message)

    const phieuList = phieuData ?? []

    return accounts.map(tk => {
      const tong_thu = phieuList
        .filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'thu')
        .reduce((s, p) => s + Number(p.gia_tri), 0)
      const tong_chi = phieuList
        .filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'chi')
        .reduce((s, p) => s + Number(p.gia_tri), 0)
      return {
        id: tk.id,
        ten_tai_khoan: tk.ten_tai_khoan,
        loai: tk.loai,
        so_du_dau_ky: Number(tk.so_du_dau_ky ?? 0),
        tong_thu,
        tong_chi,
        ton_quy: Number(tk.so_du_dau_ky ?? 0) + tong_thu - tong_chi,
      } as TongQuyRow
    })
  }
}