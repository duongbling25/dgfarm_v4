// src/presentation/hooks/useCashbook.ts
'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import type { PhieuThuChi, TaiKhoanQuy, TongQuyRow, LoaiThuChi } from '@/domain/entities/Cashbook'
import type { PagedResult } from '@/domain/repositories/ICashbookRepository'
import type { CashbookFilterDTO, LapPhieuDTO, CapNhatPhieuDTO, ThemLoaiDTO, ThemTaiKhoanDTO } from '@/application/dto/CashbookDTO'
import {
  getDanhSachPhieu, lapPhieuThu, lapPhieuChi, capNhatPhieu, huyPhieu,
  getLoaiThuChi, themLoaiThuChi, xoaLoaiThuChi,
  getTaiKhoanQuy, getTongQuy, getTongQuyTheoKy,
  themTaiKhoanQuy, suaTaiKhoanQuy, xoaTaiKhoanQuy,
} from '@/application/use-cases/cashbook/CashbookUseCases'

// ── Danh sách phiếu ────────────────────────────────────────────
export function useDanhSachPhieu(init: CashbookFilterDTO = {}) {
  const [filter, setFilter] = useState<CashbookFilterDTO>({ page: 1, page_size: 20, ...init })
  const [result, setResult] = useState<PagedResult<PhieuThuChi> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDanhSachPhieu(filter)
      setResult(data as PagedResult<PhieuThuChi>)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  return { result, loading, error, filter, setFilter, refresh: load }
}

// ── Thao tác phiếu ─────────────────────────────────────────────
export function usePhieuActions(onSuccess?: () => void) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function doLapThu(form: LapPhieuDTO) {
    setError(null)
    startTransition(async () => {
      try { await lapPhieuThu(form); onSuccess?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  function doLapChi(form: LapPhieuDTO) {
    setError(null)
    startTransition(async () => {
      try { await lapPhieuChi(form); onSuccess?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  function doCapNhat(id: string, form: CapNhatPhieuDTO, cb?: () => void) {
    setError(null)
    startTransition(async () => {
      try { await capNhatPhieu(id, form); onSuccess?.(); cb?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  function doHuy(id: string, cb?: () => void) {
    setError(null)
    startTransition(async () => {
      try { await huyPhieu(id); onSuccess?.(); cb?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  return { isPending, error, doLapThu, doLapChi, doCapNhat, doHuy }
}

// ── Tài khoản quỹ ──────────────────────────────────────────────
export function useTaiKhoanQuy(tu_ngay?: string, den_ngay?: string) {
  const [list, setList] = useState<TaiKhoanQuy[]>([])
  const [tongQuy, setTongQuy] = useState<TongQuyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const accounts = await getTaiKhoanQuy()
      setList(accounts)

      // Nếu có kỳ lọc → tính balance theo kỳ, ngược lại dùng tổng toàn thời gian
      if (tu_ngay || den_ngay) {
        const ids = accounts.map(a => a.id)
        const tq = ids.length > 0
          ? await getTongQuyTheoKy(ids, tu_ngay, den_ngay)
          : []
        setTongQuy(tq)
      } else {
        const tq = await getTongQuy()
        setTongQuy(tq)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tu_ngay, den_ngay])

  useEffect(() => { load() }, [load])

  function doThem(form: ThemTaiKhoanDTO, cb?: () => void) {
    setError(null)
    startTransition(async () => {
      try { await themTaiKhoanQuy(form); await load(); cb?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  function doSua(id: string, form: Partial<ThemTaiKhoanDTO>, cb?: () => void) {
    setError(null)
    startTransition(async () => {
      try { await suaTaiKhoanQuy(id, form); await load(); cb?.() }
      catch (e: any) { setError(e.message) }
    })
  }

  function doXoa(id: string) {
    startTransition(async () => {
      try { await xoaTaiKhoanQuy(id); await load() }
      catch (e: any) { setError(e.message) }
    })
  }

  return { list, tongQuy, loading, isPending, error, refresh: load, doThem, doSua, doXoa }
}

// ── Loại thu chi ───────────────────────────────────────────────
export function useLoaiThuChi(kieu?: 'thu' | 'chi') {
  const [list, setList] = useState<LoaiThuChi[]>([])
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async () => {
    const data = await getLoaiThuChi(kieu)
    setList(data)
  }, [kieu])

  useEffect(() => { load() }, [load])

  function doThem(form: ThemLoaiDTO, cb?: () => void) {
    startTransition(async () => {
      try { await themLoaiThuChi(form); await load(); cb?.() }
      catch (e: any) { console.error(e) }
    })
  }

  function doXoa(id: string) {
    startTransition(async () => {
      try { await xoaLoaiThuChi(id); await load() }
      catch (e: any) { console.error(e) }
    })
  }

  return { list, isPending, doThem, doXoa, refresh: load }
}
