// src/domain/repositories/ICashbookRepository.ts

import type {
  PhieuThuChi, LoaiThuChi, TaiKhoanQuy, TongQuyRow,
  CashbookKieu, CashbookTrangThai,
} from '@/domain/entities/Cashbook'

export interface CashbookFilter {
  tai_khoan_quy_id?: string
  kieu?: CashbookKieu
  trang_thai?: CashbookTrangThai
  tu_ngay?: string
  den_ngay?: string
  tu_khoa?: string
  loai_thu_chi_id?: string
  page?: number
  page_size?: number
}

export interface PagedResult<T> {
  data: T[]
  total: number
  page: number
  page_size: number
}

export interface IPhieuThuChiRepository {
  findAll(filter: CashbookFilter): Promise<PagedResult<PhieuThuChi>>
  findById(id: string): Promise<PhieuThuChi | null>
  create(data: Omit<PhieuThuChi, 'id' | 'created_at' | 'updated_at'>): Promise<PhieuThuChi>
  update(id: string, data: Partial<PhieuThuChi>): Promise<PhieuThuChi>
  huy(id: string): Promise<PhieuThuChi>
  genMaPhieu(prefix: string): Promise<string>
}

export interface ILoaiThuChiRepository {
  findAll(kieu?: CashbookKieu): Promise<LoaiThuChi[]>
  create(data: Pick<LoaiThuChi, 'ten' | 'mo_ta' | 'kieu' | 'hach_toan_kd'>): Promise<LoaiThuChi>
  delete(id: string): Promise<void>
}

export interface ITaiKhoanQuyRepository {
  findAll(): Promise<TaiKhoanQuy[]>
  findById(id: string): Promise<TaiKhoanQuy | null>
  create(data: Omit<TaiKhoanQuy, 'id' | 'created_at' | 'updated_at'>): Promise<TaiKhoanQuy>
  update(id: string, data: Partial<TaiKhoanQuy>): Promise<TaiKhoanQuy>
  delete(id: string): Promise<void>
  getTongQuy(): Promise<TongQuyRow[]>
  getTongQuyTheoKy(accountIds: string[], tu_ngay?: string, den_ngay?: string): Promise<TongQuyRow[]>
}
