// src/application/use-cases/cashbook/CashbookUseCases.ts
'use server'

import {
  getPhieuThuChiRepository,
  getLoaiThuChiRepository,
  getTaiKhoanQuyRepository,
} from '@/infrastructure/container/DIContainer'
import type { LapPhieuDTO, CapNhatPhieuDTO, ThemLoaiDTO, ThemTaiKhoanDTO, CashbookFilterDTO } from '@/application/dto/CashbookDTO'
import type { CashbookKieu } from '@/domain/entities/Cashbook'
import { revalidatePath } from 'next/cache'

// ── Prefix mã phiếu ────────────────────────────────────────────
function getPrefix(kieu: CashbookKieu, loai: string): string {
  if (kieu === 'thu') {
    if (loai === 'tien_mat') return 'TTM'
    if (loai === 'ngan_hang') return 'TNH'
    return 'TVI'
  }
  if (loai === 'tien_mat') return 'CTM'
  if (loai === 'ngan_hang') return 'CNH'
  return 'CVI'
}

// ── Phiếu Thu Chi ──────────────────────────────────────────────
export async function getDanhSachPhieu(filter: CashbookFilterDTO = {}) {
  return getPhieuThuChiRepository().findAll({ page: 1, page_size: 20, ...filter })
}

export async function getPhieuById(id: string) {
  return getPhieuThuChiRepository().findById(id)
}

export async function lapPhieuThu(form: LapPhieuDTO) {
  if (!form.loai_thu_chi_id) throw new Error('Vui lòng chọn loại thu')
  if (!form.gia_tri || form.gia_tri <= 0) throw new Error('Giá trị phải lớn hơn 0')

  const taiKhoan = await getTaiKhoanQuyRepository().findById(form.tai_khoan_quy_id)
  if (!taiKhoan) throw new Error('Tài khoản quỹ không tồn tại')

  const ma_phieu = await getPhieuThuChiRepository().genMaPhieu(getPrefix('thu', taiKhoan.loai))

  const result = await getPhieuThuChiRepository().create({
    ...form,
    kieu: 'thu',
    ma_phieu,
    trang_thai: 'da_thanh_toan',

    nguoi_dung_tao: 'Admin',
    nhan_vien_tao: 'Admin',
  } as any)
  revalidatePath('/so-quy')
  return result
}

export async function lapPhieuChi(form: LapPhieuDTO) {
  if (!form.loai_thu_chi_id) throw new Error('Vui lòng chọn loại chi')
  if (!form.gia_tri || form.gia_tri <= 0) throw new Error('Giá trị phải lớn hơn 0')

  const taiKhoan = await getTaiKhoanQuyRepository().findById(form.tai_khoan_quy_id)
  if (!taiKhoan) throw new Error('Tài khoản quỹ không tồn tại')

  const ma_phieu = await getPhieuThuChiRepository().genMaPhieu(getPrefix('chi', taiKhoan.loai))

  const result = await getPhieuThuChiRepository().create({
    ...form,
    kieu: 'chi',
    ma_phieu,
    trang_thai: 'da_thanh_toan',

    nguoi_dung_tao: 'Admin',
    nhan_vien_tao: 'Admin',
  } as any)
  revalidatePath('/so-quy')
  return result
}

export async function capNhatPhieu(id: string, form: CapNhatPhieuDTO) {
  const result = await getPhieuThuChiRepository().update(id, form)
  revalidatePath('/so-quy')
  return result
}

export async function huyPhieu(id: string) {
  const result = await getPhieuThuChiRepository().huy(id)
  revalidatePath('/so-quy')
  return result
}

// ── Loại Thu Chi ───────────────────────────────────────────────
export async function getLoaiThuChi(kieu?: CashbookKieu) {
  return getLoaiThuChiRepository().findAll(kieu)
}

export async function themLoaiThuChi(form: ThemLoaiDTO) {
  if (!form.ten?.trim()) throw new Error('Tên loại không được rỗng')
  const result = await getLoaiThuChiRepository().create(form)
  revalidatePath('/so-quy')
  return result
}

export async function xoaLoaiThuChi(id: string) {
  await getLoaiThuChiRepository().delete(id)
  revalidatePath('/so-quy')
}

// ── Tài Khoản Quỹ ──────────────────────────────────────────────
export async function getTaiKhoanQuy() {
  return getTaiKhoanQuyRepository().findAll()
}

export async function getTongQuy() {
  return getTaiKhoanQuyRepository().getTongQuy()
}

export async function themTaiKhoanQuy(form: ThemTaiKhoanDTO) {
  if (!form.ten_tai_khoan?.trim()) throw new Error('Tên tài khoản không được rỗng')
  const result = await getTaiKhoanQuyRepository().create(form as any)
  revalidatePath('/so-quy')
  return result
}

export async function suaTaiKhoanQuy(id: string, form: Partial<ThemTaiKhoanDTO>) {
  const result = await getTaiKhoanQuyRepository().update(id, form as any)
  revalidatePath('/so-quy')
  return result
}

export async function xoaTaiKhoanQuy(id: string) {
  await getTaiKhoanQuyRepository().delete(id)
  revalidatePath('/so-quy')
}

export async function getTongQuyTheoKy(
  accountIds: string[],
  tu_ngay?: string,
  den_ngay?: string,
) {
  return getTaiKhoanQuyRepository().getTongQuyTheoKy(accountIds, tu_ngay, den_ngay)
}

// ── Xuất CSV ───────────────────────────────────────────────────
export async function xuatCsvSoQuy(filter: CashbookFilterDTO): Promise<string> {
  const result = await getPhieuThuChiRepository().findAll({ ...filter, page: 1, page_size: 10000 })
  const headers = ['Mã phiếu', 'Thời gian', 'Loại thu chi', 'Người nộp/nhận', 'Giá trị', 'Trạng thái', 'Ghi chú']
  const rows = result.data.map(p => [
    p.ma_phieu,
    new Date(p.thoi_gian).toLocaleString('vi-VN'),
    (p as any).loai?.ten ?? '',
    p.ten_doi_tuong ?? '',
    p.kieu === 'thu' ? p.gia_tri : -p.gia_tri,
    p.trang_thai === 'da_thanh_toan' ? 'Đã thanh toán' : 'Đã hủy',
    p.ghi_chu ?? '',
  ])
  return [headers, ...rows].map(r => r.join(',')).join('\n')
}
