// src/infrastructure/supabase/repositories/SupabaseCashbookRepository.ts
//
// DB dùng 2 hệ thống bảng song song. File này đọc/ghi vào bộ có dữ liệu:
//   cashbook_phieu  (FK: loai_thu_chi_id → cashbook_loai, tai_khoan_quy_id → cashbook_tai_khoan)
//   cashbook_tai_khoan
//   cashbook_loai

import { createClient } from '@/infrastructure/supabase/server'
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

// ─────────────────────────────────────────────────────────────
// PHIẾU THU CHI  →  bảng cashbook_phieu
// ─────────────────────────────────────────────────────────────
export class SupabasePhieuThuChiRepository implements IPhieuThuChiRepository {

  async findAll(filter: CashbookFilter): Promise<PagedResult<PhieuThuChi>> {
    const supabase = await createClient()
    const {
      tai_khoan_quy_id, kieu, trang_thai,
      tu_ngay, den_ngay, tu_khoa, loai_thu_chi_id,
      page = 1, page_size = 20,
    } = filter

    let q = supabase
      .from('cashbook_phieu')
      // join FK: loai_thu_chi_id → cashbook_loai, tai_khoan_quy_id → cashbook_tai_khoan
      .select(
        '*, loai:loai_thu_chi_id(id,ten,kieu,hach_toan_kd), tai_khoan:tai_khoan_quy_id(id,ten_tai_khoan,loai)',
        { count: 'exact' }
      )
      .order('thoi_gian', { ascending: false })

    if (tai_khoan_quy_id) q = q.eq('tai_khoan_quy_id', tai_khoan_quy_id)
    if (kieu)             q = q.eq('kieu', kieu)
    if (trang_thai)       q = q.eq('trang_thai', trang_thai)
    if (tu_ngay)          q = q.gte('thoi_gian', tu_ngay)
    // FIX timezone: den_ngay dùng end-of-day UTC+7 thay vì T23:59:59 local
    if (den_ngay)         q = q.lt('thoi_gian', den_ngay + 'T17:00:00.000Z') // 17:00 UTC = 00:00 ngày hôm sau UTC+7
    if (loai_thu_chi_id)  q = q.eq('loai_thu_chi_id', loai_thu_chi_id)
    if (tu_khoa) {
      q = q.or(
        `ma_phieu.ilike.%${tu_khoa}%,ten_doi_tuong.ilike.%${tu_khoa}%,ghi_chu.ilike.%${tu_khoa}%`
      )
    }

    const from = (page - 1) * page_size
    q = q.range(from, from + page_size - 1)

    const { data, error, count } = await q

    // DEBUG — xem terminal/server logs để tìm nguyên nhân data rỗng
    console.log('[CashbookRepo] findAll:', { error: error?.message, count, rowCount: data?.length, filter: JSON.stringify(filter) })

    if (error) throw new Error(error.message)

    // PostgREST trả alias 'loai' và 'tai_khoan' → map lại thành tên field entity
    const list = (data ?? []).map((row: any) => ({
      ...row,
      loai_thu_chi: row.loai    ?? null,
      tai_khoan_quy: row.tai_khoan ?? null,
    })) as unknown as PhieuThuChi[]

    return { data: list, total: count ?? 0, page, page_size }
  }

  async findById(id: string): Promise<PhieuThuChi | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cashbook_phieu')
      .select('*, loai:loai_thu_chi_id(id,ten,kieu), tai_khoan:tai_khoan_quy_id(id,ten_tai_khoan,loai)')
      .eq('id', id)
      .single()
    if (error) return null
    return {
      ...data,
      loai_thu_chi:  (data as any).loai     ?? null,
      tai_khoan_quy: (data as any).tai_khoan ?? null,
    } as unknown as PhieuThuChi
  }

  async create(
    payload: Omit<PhieuThuChi, 'id' | 'created_at' | 'updated_at'>
  ): Promise<PhieuThuChi> {
    const supabase = await createClient()

    // Chỉ giữ lại các cột thực sự tồn tại trong cashbook_phieu
    // Bỏ: loai_thu_chi (join), tai_khoan_quy (join), chi_nhanh_id (không có trong bảng này)
    const {
      loai_thu_chi,   // joined field - bỏ
      tai_khoan_quy,  // joined field - bỏ
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ...rest
    } = payload as any

    const insertData = {
      ma_phieu:        rest.ma_phieu,
      kieu:            rest.kieu,
      thoi_gian:       rest.thoi_gian,
      loai_thu_chi_id: rest.loai_thu_chi_id ?? null,
      tai_khoan_quy_id: rest.tai_khoan_quy_id,   // NOT NULL trong DB
      gia_tri:         rest.gia_tri,
      nhom_doi_tuong:  rest.nhom_doi_tuong  ?? null,
      ten_doi_tuong:   rest.ten_doi_tuong   ?? null,
      doi_tuong_id:    rest.doi_tuong_id    ?? null,
      hach_toan_kd:    rest.hach_toan_kd    ?? true,
      trang_thai:      rest.trang_thai      ?? 'da_thanh_toan',
      ma_chung_tu_goc: rest.ma_chung_tu_goc ?? null,
      ghi_chu:         rest.ghi_chu         ?? null,
      nguoi_dung_tao:  rest.nguoi_dung_tao  ?? null,
      nhan_vien_tao:   rest.nhan_vien_tao   ?? null,
      chi_nhanh:       rest.chi_nhanh       ?? null,  // varchar, không phải uuid
    }

    const { data, error } = await supabase
      .from('cashbook_phieu')
      .insert(insertData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as unknown as PhieuThuChi
  }

  async update(id: string, payload: Partial<PhieuThuChi>): Promise<PhieuThuChi> {
    const supabase = await createClient()
    // Bỏ joined fields và chi_nhanh_id (không tồn tại trong bảng)
    const { loai_thu_chi, tai_khoan_quy, ...rest } = payload as any
    const updateData = { ...rest, updated_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('cashbook_phieu')
      .update(updateData)
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
    const { count } = await supabase
      .from('cashbook_phieu')
      .select('*', { count: 'exact', head: true })
      .like('ma_phieu', `${prefix}%`)
    const seq = (count ?? 0) + 1
    return `${prefix}${String(seq).padStart(6, '0')}`
  }
}

// ─────────────────────────────────────────────────────────────
// LOẠI THU CHI  →  bảng cashbook_loai
// ─────────────────────────────────────────────────────────────
export class SupabaseLoaiThuChiRepository implements ILoaiThuChiRepository {

  async findAll(kieu?: CashbookKieu): Promise<LoaiThuChi[]> {
    const supabase = await createClient()
    let q = supabase
      .from('cashbook_loai')
      .select('*')
      .order('la_he_thong', { ascending: false })
      .order('ten')
    if (kieu) q = q.eq('kieu', kieu)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return (data ?? []) as LoaiThuChi[]
  }

  async create(
    payload: Pick<LoaiThuChi, 'ten' | 'mo_ta' | 'kieu' | 'hach_toan_kd'>
  ): Promise<LoaiThuChi> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cashbook_loai')
      .insert({ ...payload, la_he_thong: false })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as LoaiThuChi
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cashbook_loai')
      .delete()
      .eq('id', id)
      .eq('la_he_thong', false)
    if (error) throw new Error(error.message)
  }
}

// ─────────────────────────────────────────────────────────────
// TÀI KHOẢN QUỸ  →  bảng cashbook_tai_khoan
// ─────────────────────────────────────────────────────────────
export class SupabaseTaiKhoanQuyRepository implements ITaiKhoanQuyRepository {

  async findAll(): Promise<TaiKhoanQuy[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cashbook_tai_khoan')
      .select('*')
      .order('la_mac_dinh', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []) as TaiKhoanQuy[]
  }

  async findById(id: string): Promise<TaiKhoanQuy | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cashbook_tai_khoan')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as TaiKhoanQuy
  }

  async create(
    payload: Omit<TaiKhoanQuy, 'id' | 'created_at' | 'updated_at'>
  ): Promise<TaiKhoanQuy> {
    const supabase = await createClient()
    // cashbook_tai_khoan không có chi_nhanh_id → strip
    const { chi_nhanh_id, ...insertData } = payload as any
    const { data, error } = await supabase
      .from('cashbook_tai_khoan')
      .insert(insertData)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as TaiKhoanQuy
  }

  async update(id: string, payload: Partial<TaiKhoanQuy>): Promise<TaiKhoanQuy> {
    const supabase = await createClient()
    const { chi_nhanh_id, ...updateData } = payload as any
    const { data, error } = await supabase
      .from('cashbook_tai_khoan')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as TaiKhoanQuy
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase
      .from('cashbook_tai_khoan')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
  }

  async getTongQuy(): Promise<TongQuyRow[]> {
    const supabase = await createClient()

    // 1. Lấy tất cả tài khoản
    const { data: tkData, error: tkError } = await supabase
      .from('cashbook_tai_khoan')
      .select('*')

    // DEBUG — kiểm tra xem RLS có block cashbook_tai_khoan không
    console.log('[CashbookRepo] getTongQuy - cashbook_tai_khoan:', { error: tkError?.message, count: tkData?.length })

    if (tkError) throw new Error(tkError.message)

    const accounts = (tkData ?? []) as TaiKhoanQuy[]
    if (accounts.length === 0) return []

    // 2. Lấy tổng thu/chi từ cashbook_phieu (chỉ phiếu đã thanh toán)
    const { data: phieuData, error: phieuError } = await supabase
      .from('cashbook_phieu')
      .select('tai_khoan_quy_id, kieu, gia_tri')
      .eq('trang_thai', 'da_thanh_toan')
      .in('tai_khoan_quy_id', accounts.map(a => a.id))
    if (phieuError) throw new Error(phieuError.message)

    const phieuList = phieuData ?? []

    // 3. Tính tồn quỹ mỗi tài khoản
    return accounts.map(tk => {
      const tong_thu = phieuList
        .filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'thu')
        .reduce((s, p) => s + Number(p.gia_tri), 0)
      const tong_chi = phieuList
        .filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'chi')
        .reduce((s, p) => s + Number(p.gia_tri), 0)
      const so_du_dau_ky = Number(tk.so_du_dau_ky ?? 0)
      return {
        id:           tk.id,
        ten_tai_khoan: tk.ten_tai_khoan,
        loai:         tk.loai,
        so_du_dau_ky,
        tong_thu,
        tong_chi,
        ton_quy: so_du_dau_ky + tong_thu - tong_chi,
      } as TongQuyRow
    })
  }

  // MỚI: Tính balance theo kỳ (có tu_ngay / den_ngay)
  async getTongQuyTheoKy(
    accountIds: string[],
    tu_ngay?: string,
    den_ngay?: string,
  ): Promise<TongQuyRow[]> {
    const supabase = await createClient()

    const { data: tkData, error: tkError } = await supabase
      .from('cashbook_tai_khoan')
      .select('*')
      .in('id', accountIds)
    if (tkError) throw new Error(tkError.message)

    const accounts = (tkData ?? []) as TaiKhoanQuy[]
    if (accounts.length === 0) return []

    // Phiếu trước kỳ → tính tồn đầu kỳ
    let qTruoc = supabase
      .from('cashbook_phieu')
      .select('tai_khoan_quy_id, kieu, gia_tri')
      .eq('trang_thai', 'da_thanh_toan')
      .in('tai_khoan_quy_id', accountIds)
    if (tu_ngay) qTruoc = qTruoc.lt('thoi_gian', tu_ngay)

    // Phiếu trong kỳ → tính thu/chi kỳ
    let qTrongKy = supabase
      .from('cashbook_phieu')
      .select('tai_khoan_quy_id, kieu, gia_tri')
      .eq('trang_thai', 'da_thanh_toan')
      .in('tai_khoan_quy_id', accountIds)
    if (tu_ngay)  qTrongKy = qTrongKy.gte('thoi_gian', tu_ngay)
    if (den_ngay) qTrongKy = qTrongKy.lt('thoi_gian', den_ngay + 'T17:00:00.000Z')

    const [{ data: truocData }, { data: trongData }] = await Promise.all([
      qTruoc, qTrongKy,
    ])

    const truocList  = truocData  ?? []
    const trongList  = trongData  ?? []

    return accounts.map(tk => {
      // Tồn đầu kỳ = số dư đầu kỳ khai báo + toàn bộ giao dịch trước kỳ
      const truoc_thu = truocList.filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'thu').reduce((s, p) => s + Number(p.gia_tri), 0)
      const truoc_chi = truocList.filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'chi').reduce((s, p) => s + Number(p.gia_tri), 0)
      const so_du_dau_ky = Number(tk.so_du_dau_ky ?? 0)
      const ton_dau_ky   = tu_ngay ? so_du_dau_ky + truoc_thu - truoc_chi : so_du_dau_ky

      const tong_thu = trongList.filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'thu').reduce((s, p) => s + Number(p.gia_tri), 0)
      const tong_chi = trongList.filter(p => p.tai_khoan_quy_id === tk.id && p.kieu === 'chi').reduce((s, p) => s + Number(p.gia_tri), 0)

      return {
        id: tk.id,
        ten_tai_khoan: tk.ten_tai_khoan,
        loai: tk.loai,
        so_du_dau_ky:  ton_dau_ky,   // đây là tồn đầu kỳ thực tế
        tong_thu,
        tong_chi,
        ton_quy: ton_dau_ky + tong_thu - tong_chi,
      } as TongQuyRow
    })
  }
}