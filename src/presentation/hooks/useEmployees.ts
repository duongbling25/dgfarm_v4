'use client'

import { useState, useTransition } from 'react'
import type { Employee } from '@/domain/entities/Staff'
import {
  addEmployeeUseCase,
  updateEmployeeUseCase,
  deleteEmployeesUseCase,
} from '@/application/use-cases/staff/StaffUseCases'

export function useEmployees(initialEmployees: Employee[]) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER = 8

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editEmp, setEditEmp] = useState<Employee | null>(null)
  const [isPending, startTransition] = useTransition()

  const [fName, setFName] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fBirthday, setFBirthday] = useState('')
  const [fPosition, setFPosition] = useState('')

  const filtered = employees.filter(e => {
    const q = search.toLowerCase()
    return !q || e.id.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || (e.phone || '').includes(q)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice = filtered.slice((safePage - 1) * PER, safePage * PER)

  const toggleRow = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = (c: boolean) => setSelected(c ? new Set(slice.map(e => e.id)) : new Set())

  const openAdd = () => { setFName(''); setFPhone(''); setFBirthday(''); setFPosition(''); setShowAdd(true) }
  const openEdit = (e: Employee, ev: React.MouseEvent) => {
    ev.stopPropagation()
    setEditEmp(e); setFName(e.name); setFPhone(e.phone || ''); setFBirthday(e.birthday || ''); setFPosition(e.position || '')
  }

  const doAdd = () => {
    if (!fName) { alert('Vui lòng nhập tên!'); return }
    startTransition(async () => {
      await addEmployeeUseCase({ name: fName, phone: fPhone, birthday: fBirthday, position: fPosition })
      const today = new Date().toISOString().split('T')[0]
      const id = 'NV' + String(employees.length + 1).padStart(3, '0')
      setEmployees(p => [{ id, name: fName, phone: fPhone || null, birthday: fBirthday || null, position: fPosition || null, account_id: null, created_at: today }, ...p])
      setShowAdd(false)
    })
  }

  const doEdit = () => {
    if (!editEmp || !fName) return
    startTransition(async () => {
      await updateEmployeeUseCase(editEmp.id, { name: fName, phone: fPhone, birthday: fBirthday, position: fPosition })
      setEmployees(p => p.map(e => e.id === editEmp!.id ? { ...e, name: fName, phone: fPhone || null, birthday: fBirthday || null, position: fPosition || null } : e))
      setEditEmp(null)
    })
  }

  const doDelete = () => startTransition(async () => {
    await deleteEmployeesUseCase([...selected])
    setEmployees(p => p.filter(e => !selected.has(e.id)))
    setSelected(new Set()); setShowConfirm(false)
  })

  return {
    employees, filtered, slice, pages, safePage,
    search, setSearch, page, setPage,
    selected, showConfirm, setShowConfirm,
    showAdd, setShowAdd, editEmp, setEditEmp,
    fName, setFName, fPhone, setFPhone, fBirthday, setFBirthday, fPosition, setFPosition,
    toggleRow, toggleAll, openAdd, openEdit, doAdd, doEdit, doDelete,
    isPending,
  }
}