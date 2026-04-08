'use client'

import React, { useState, useTransition } from 'react'
import type { Account, Employee } from '@/domain/entities/Staff'
import { addAccountUseCase, updateAccountUseCase, deleteAccountsUseCase } from '@/application/use-cases/staff/StaffUseCases'
import { Overlay, PgBtn, DeleteBar, ConfirmDeleteModal, btnGreen } from '@/presentation/components/ui/SharedUI'

const rowGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '44px 100px 1fr 1fr 120px 160px 120px 90px',
  padding: '0 14px', alignItems: 'center', fontSize: 13, color: '#000',
}

const roleBadge = (r: string) => {
  const styles: Record<string, React.CSSProperties> = {
    'admin':   { background: '#fff1cc', color: '#b45309', border: '1px solid #fcd34d' },
    'manager': { background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' },
    'staff':   { background: '#e6f9f0', color: '#057a55', border: '1px solid #a0dfc4' },
  }
  const label = r === 'admin' ? 'Admin' : r === 'manager' ? 'Quản lý' : 'Nhân viên'
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', ...styles[r] }}>{label}</span>
}

interface Props {
  initialAccounts: Account[]
  employees: Employee[]
  callerRole: 'admin' | 'manager' | 'staff'
}

export default function AccountTable({ initialAccounts, employees, callerRole }: Props) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER = 10
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editAcc, setEditAcc] = useState<Account | null>(null)
  const [isPending, startTransition] = useTransition()

  const [fName, setFName] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fRole, setFRole] = useState<'admin' | 'manager' | 'staff'>('staff')
  const [fEmployeeId, setFEmployeeId] = useState('')

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase()
    if (!q) return true
    return a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PER))
  const safePage = Math.min(page, pages)
  const slice = filtered.slice((safePage - 1) * PER, safePage * PER)

  const toggleRow = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = (checked: boolean) => setSelected(checked ? new Set(slice.map(a => a.id)) : new Set())

  const doDelete = () => startTransition(async () => {
    await deleteAccountsUseCase([...selected], callerRole)
    setAccounts(p => p.filter(a => !selected.has(a.id)))
    setSelected(new Set()); setShowConfirmDelete(false)
  })

  const openAdd = () => { setFName(''); setFEmail(''); setFRole('staff'); setFEmployeeId(''); setShowAddModal(true) }

  const openEdit = (a: Account, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditAcc(a); setFName(a.name); setFEmail(a.email); setFRole(a.role); setFEmployeeId(a.employee_id || '')
  }

  const doAdd = () => {
    if (!fName || !fEmail) { alert('Vui lòng nhập tên và email!'); return }
    startTransition(async () => {
      await addAccountUseCase({ name: fName, email: fEmail, role: fRole, employee_id: fEmployeeId, callerRole })
      const today = new Date().toISOString().split('T')[0]
      const newId = 'ACC' + String(accounts.length + 1).padStart(3, '0')
      const emp = employees.find(e => e.id === fEmployeeId)
      setAccounts(p => [...p, { id: newId, name: fName, email: fEmail, role: fRole, employee_id: fEmployeeId || null, auth_id: null, pin_hash: null, created_at: today, employee_name: emp?.name }])
      setShowAddModal(false)
    })
  }

  const doEdit = () => {
    if (!editAcc || !fName || !fEmail) return
    startTransition(async () => {
      await updateAccountUseCase(editAcc.id, { name: fName, email: fEmail, role: fRole, callerRole })
      setAccounts(p => p.map(a => a.id === editAcc!.id ? { ...a, name: fName, email: fEmail, role: fRole } : a))
      setEditAcc(null)
    })
  }

  return (
    <>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', background: '#E5E5E5', paddingLeft: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#000' }}>Danh sách tài khoản</span>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ width: 400, position: 'relative', height: 38, background: '#fff', borderRadius: 4, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Tìm theo mã, tên, email..."
              style={{ width: '100%', height: '100%', border: 'none', outline: 'none', fontSize: 13, padding: '0 40px 0 14px', background: 'transparent' }} />
            <span style={{ position: 'absolute', right: 12, color: '#797979', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          </div>
          <button onClick={openAdd} style={{ ...btnGreen, background: '#253584' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Thêm tài khoản
          </button>
        </div>

        <div style={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ ...rowGrid, background: '#CEE8FF', height: 44, fontWeight: 700, borderBottom: '1px solid #b8d8f0' }}>
            <div><input type="checkbox" checked={slice.length > 0 && slice.every(a => selected.has(a.id))} onChange={ev => toggleAll(ev.target.checked)} style={{ width: 15, height: 15, accentColor: '#253584', cursor: 'pointer' }} /></div>
            <div>Mã TK</div><div>Tên hiển thị</div><div>Email đăng nhập</div>
            <div>Role</div><div>Nhân viên liên kết</div><div>Ngày tạo</div><div>Thao tác</div>
          </div>

          {slice.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: '#aaa', background: '#fff' }}>Chưa có tài khoản nào</div>
          )}

          {slice.map(a => (
            <div key={a.id} style={{ ...rowGrid, height: 46, background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
              <div><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleRow(a.id)} style={{ width: 15, height: 15, accentColor: '#253584', cursor: 'pointer' }} /></div>
              <div style={{ color: '#253584', fontWeight: 700 }}>{a.id}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#555' }}>{a.email}</div>
              <div>{roleBadge(a.role)}</div>
              <div style={{ color: '#555' }}>{a.employee_name || '—'}</div>
              <div style={{ color: '#888', fontSize: 12 }}>{a.created_at}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => openEdit(a, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#f97316' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => { setSelected(new Set([a.id])); setShowConfirmDelete(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#e53e3e' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '10px 14px', background: '#fff', borderTop: '1px solid #eee', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#666', marginRight: 10 }}>Tổng: {filtered.length} tài khoản</span>
            {pages > 1 && (<>
              <PgBtn disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</PgBtn>
              {Array.from({ length: pages }, (_, i) => <PgBtn key={i} active={i + 1 === safePage} onClick={() => setPage(i + 1)}>{i + 1}</PgBtn>)}
              <PgBtn disabled={safePage === pages} onClick={() => setPage(safePage + 1)}>›</PgBtn>
            </>)}
          </div>
        </div>

        
      </div>

      <DeleteBar count={selected.size} onDelete={() => setShowConfirmDelete(true)} />
      {showConfirmDelete && <ConfirmDeleteModal count={selected.size} onConfirm={doDelete} onCancel={() => setShowConfirmDelete(false)} isPending={isPending} />}

      {showAddModal && (
        <Overlay>
          <AccountForm title="Thêm tài khoản mới" employees={employees}
            name={fName} email={fEmail} role={fRole} employeeId={fEmployeeId}
            setName={setFName} setEmail={setFEmail} setRole={setFRole} setEmployeeId={setFEmployeeId}
            onSave={doAdd} onCancel={() => setShowAddModal(false)} isPending={isPending}
            callerRole={callerRole} />
        </Overlay>
      )}

      {editAcc && (
        <Overlay>
          <AccountForm title={`Chỉnh sửa: ${editAcc.id}`} employees={employees}
            name={fName} email={fEmail} role={fRole} employeeId={fEmployeeId}
            setName={setFName} setEmail={setFEmail} setRole={setFRole} setEmployeeId={setFEmployeeId}
            onSave={doEdit} onCancel={() => setEditAcc(null)} isPending={isPending}
            callerRole={callerRole} />
        </Overlay>
      )}
    </>
  )
}

function AccountForm({ title, employees, name, email, role, employeeId, setName, setEmail, setRole, setEmployeeId, onSave, onCancel, isPending, callerRole }: {
  title: string; employees: Employee[]
  name: string; email: string; role: 'admin' | 'manager' | 'staff'; employeeId: string
  setName: (v: string) => void; setEmail: (v: string) => void
  setRole: (v: 'admin' | 'manager' | 'staff') => void; setEmployeeId: (v: string) => void
  onSave: () => void; onCancel: () => void; isPending: boolean
  callerRole: 'admin' | 'manager' | 'staff'
}) {
  const inp: React.CSSProperties = { width: '100%', height: 34, padding: '0 10px', border: '1.5px solid #ddd', borderRadius: 7, fontSize: 13, outline: 'none', color: '#222', background: '#fafafa' }
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 18px', width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0E176E', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>Tên hiển thị *</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nhập tên" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>Email đăng nhập *</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Nhập email" style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>Role</div>
          <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'manager' | 'staff')} style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
            <option value="staff">Nhân viên</option>
            <option value="manager">Quản lý</option>
            {callerRole === 'admin' && <option value="admin">Admin</option>}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>Nhân viên liên kết</div>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={{ ...inp, appearance: 'none', cursor: 'pointer' }}>
            <option value="">-- Không liên kết --</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.id} — {emp.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onSave} disabled={isPending} style={{ flex: 1, height: 38, background: '#253584', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{isPending ? '...' : 'Lưu'}</button>
        <button onClick={onCancel} style={{ flex: 1, height: 38, background: '#eee', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Hủy</button>
      </div>
    </div>
  )
}