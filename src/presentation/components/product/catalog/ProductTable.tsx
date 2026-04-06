'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Product, ProductType, ProductGroup } from '@/domain/entities/Product'
import {
  addProductUseCase,
  bulkAddProductsUseCase,
  updateProductUseCase,
  deleteProductsUseCase,
} from '@/application/use-cases/product/ProductUseCases'
import { Overlay, PgBtn, DeleteBar, ConfirmDeleteModal, btnGreen } from '@/presentation/components/ui/SharedUI'

const GROUPS: ProductGroup[] = ['Trái cây', 'Rau củ', 'Thực phẩm', 'Đồ uống', 'Khác']
const TYPES: ProductType[] = ['Hàng hóa', 'Dịch vụ', 'Combo - Đóng gói']
const PER = 10
const BRANCHES = ['Chi nhánh trung tâm']

const fmt = (n: number) => n.toLocaleString('vi-VN').replace(/\./g, ',')

function stockColor(p: Product) {
  if (p.stock === 0)         return '#9E422C'
  if (p.stock < p.min_stock) return '#EF4444'
  if (p.stock > p.max_stock) return '#F59E0B'
  return '#15803D'
}

const groupColors: Record<string, string> = {
  'Trái cây': '#4ADE80', 'Rau củ': '#86EFAC', 'Thực phẩm': '#FCD34D',
  'Đồ uống': '#60A5FA', 'Khác': '#94A3B8',
}

function resizeImage(file: File, maxSize = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', 0.82))
    }
    img.onerror = reject
    img.src = url
  })
}

function emptyForm() {
  return {
    name: '', group: 'Trái cây' as ProductGroup, type: 'Hàng hóa' as ProductType,
    sell_price: 0, cost_price: 0, stock: 0, min_stock: 0, max_stock: 999,
    location: '', brand: '', supplier_id: '', can_sell_direct: true,
    has_points: false, note: '', image_url: '', expected_order: 0, unit: '',
    branch_stock: {} as Record<string, number>,
  }
}

const inp: React.CSSProperties = {
  width: '100%', height: 36, border: '1px solid #e2e8f0', borderRadius: 8,
  padding: '0 10px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  background: '#f8fafc',
}

// ── CSV Export ────────────────────────────────────────────────
function exportToCSV(products: Product[]) {
  const headers = ['Mã hàng','Tên hàng','Nhóm','Loại','Giá bán','Giá vốn','Tồn kho','Min','Max','Thương hiệu','Vị trí','Ghi chú']
  const rows = products.map(p => [p.code,p.name,p.group,p.type,p.sell_price,p.cost_price,p.stock,p.min_stock,p.max_stock,p.brand??'',p.location??'',p.note??''])
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`hang-hoa-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
}

// ── CSV Import Modal ──────────────────────────────────────────
function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [err, setErr] = useState('')
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function splitCSVLine(line: string): string[] {
    const result: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) {
        result.push(cur.trim()); cur = ''
      } else cur += ch
    }
    result.push(cur.trim())
    return result
  }

  function parseCSV(text: string) {
    const lines = text.replace(/^\uFEFF/,'').replace(/\r/g,'').trim().split('\n').filter(Boolean)
    if (lines.length < 2) { setErr('File không có dữ liệu'); return }
    const headers = splitCSVLine(lines[0])
    const colMap: Record<string,string> = {'Mã hàng':'id','Tên hàng':'name','Nhóm':'group','Loại':'type','Giá bán':'sell_price','Giá vốn':'cost_price','Tồn kho':'stock','Min':'min_stock','Max':'max_stock','Thương hiệu':'brand','Vị trí':'location','Ghi chú':'note'}
    const idxMap: Record<string,number> = {}
    headers.forEach((h,i)=>{ idxMap[h]=i })
    const parsed = lines.slice(1).map(line => {
      const cells = splitCSVLine(line)
      const row: any = {group:'Khác',type:'Hàng hóa',sell_price:0,cost_price:0,stock:0,min_stock:0,max_stock:9999,can_sell_direct:true,has_points:false}
      Object.entries(colMap).forEach(([header,field])=>{
        if(idxMap[header]!==undefined){
          const trimmed = (cells[idxMap[header]]??'').trim()
          if(trimmed==='') return
          row[field]=['sell_price','cost_price','stock','min_stock','max_stock'].includes(field)?Number(trimmed)||0:trimmed
        }
      })
      const validGroups=['Trái cây','Rau củ','Thực phẩm','Đồ uống','Khác']
      const validTypes=['Hàng hóa','Dịch vụ','Combo - Đóng gói']
      if(!validGroups.includes(row.group)) row.group='Khác'
      if(!validTypes.includes(row.type)) row.type='Hàng hóa'
      return row
    }).filter(r=>r.name?.trim())
    if (!parsed.length) { setErr('Không tìm thấy dữ liệu hợp lệ'); return }
    setRows(parsed); setErr('')
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const isXlsx = /\.(xlsx|xls)$/i.test(file.name)
    const reader = new FileReader()

    function processRows(headers: string[], dataRows: any[][]) {
      const colMap: Record<string,string> = {'Mã hàng':'id','Tên hàng':'name','Nhóm':'group','Loại':'type','Giá bán':'sell_price','Giá vốn':'cost_price','Tồn kho':'stock','Min':'min_stock','Max':'max_stock','Thương hiệu':'brand','Vị trí':'location','Ghi chú':'note'}
      const idxMap: Record<string,number> = {}
      headers.forEach((h,i)=>{ idxMap[h.trim()]=i })
      const parsed = dataRows.map(cells => {
        const row: any = {group:'Khác',type:'Hàng hóa',sell_price:0,cost_price:0,stock:0,min_stock:0,max_stock:9999,can_sell_direct:true,has_points:false}
        Object.entries(colMap).forEach(([header,field])=>{
          if(idxMap[header]!==undefined){
            const val = String(cells[idxMap[header]]??'').trim()
            if(val==='') return
            row[field]=['sell_price','cost_price','stock','min_stock','max_stock'].includes(field)?Number(val)||0:val
          }
        })
        const validGroups=['Trái cây','Rau củ','Thực phẩm','Đồ uống','Khác']
        const validTypes=['Hàng hóa','Dịch vụ','Combo - Đóng gói']
        if(!validGroups.includes(row.group)) row.group='Khác'
        if(!validTypes.includes(row.type)) row.type='Hàng hóa'
        return row
      }).filter((r:any)=>r.name?.trim())
      if(!parsed.length){setErr('Không tìm thấy dữ liệu hợp lệ');return}
      setRows(parsed); setErr('')
    }

    if (isXlsx) {
      reader.onload = ev => {
        const loadXlsx = () => new Promise<any>(resolve => {
          if ((window as any).XLSX) { resolve((window as any).XLSX); return }
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
          s.onload = () => resolve((window as any).XLSX)
          document.head.appendChild(s)
        })
        loadXlsx().then(XLSX => {
          const wb = XLSX.read(ev.target?.result, {type:'array'})
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data: any[][] = XLSX.utils.sheet_to_json(ws, {header:1, defval:''})
          if(data.length<2){setErr('File không có dữ liệu');return}
          processRows(data[0] as string[], data.slice(1))
        }).catch(()=>setErr('Không thể đọc file xlsx'))
      }
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = ev => parseCSV(ev.target?.result as string)
      reader.readAsText(file,'utf-8')
    }
    e.target.value=''
  }

  function handleImport() {
    startTransition(async () => {
      try {
        const results = await bulkAddProductsUseCase(rows)
        const failed = results.filter((r: any) => !r.ok)
        if (failed.length > 0) {
          setErr(`${failed.length} dòng lỗi: ${failed[0].error}`)
          return
        }
        onImported(); onClose()
      } catch(e:any) { setErr(e.message ?? JSON.stringify(e)) }
    })
  }

  

  const L: React.CSSProperties = {fontSize:11,fontWeight:600,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}
  return (
    <Overlay>
      <div style={{background:'#fff',borderRadius:16,width:540,maxHeight:'85vh',overflowY:'auto',padding:28,boxShadow:'0 8px 40px rgba(0,0,0,0.18)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <span style={{fontWeight:700,fontSize:17,color:'#0f172a'}}>Nhập file hàng hóa</span>
          <button onClick={onClose} style={{border:'none',background:'none',fontSize:20,cursor:'pointer',color:'#94A3B8'}}>✕</button>
        </div>
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:14,marginBottom:20}}>
          <div style={{fontSize:13,color:'#166534',fontWeight:600,marginBottom:6}}>Cột CSV hỗ trợ:</div>
          <div style={{fontSize:11,color:'#15803d',fontFamily:'monospace',lineHeight:1.8}}>Tên hàng, Nhóm, Loại, Giá bán, Giá vốn, Tồn kho, Min, Max, Thương hiệu, Vị trí, Ghi chú</div>
          <button onClick={()=>{
            const s='Mã hàng,Tên hàng,Nhóm,Loại,Giá bán,Giá vốn,Tồn kho,Min,Max,Thương hiệu,Vị trí,Ghi chú\n,Quýt Mỹ,Trái cây,Hàng hóa,25000,18000,100,10,500,DGFarm,A1,\n,Cà rốt Đà Lạt,Rau củ,Hàng hóa,15000,10000,200,20,1000,,B2,'
            const blob=new Blob(['\uFEFF'+s],{type:'text/csv;charset=utf-8;'})
            const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='mau-hang-hoa.csv'; a.click(); URL.revokeObjectURL(url)
          }} style={{marginTop:10,fontSize:12,color:'#166534',background:'transparent',border:'1px solid #86efac',borderRadius:6,padding:'4px 12px',cursor:'pointer',fontWeight:600}}>
            ⬇ Tải file mẫu
          </button>
        </div>
        <div style={{marginBottom:16}}>
          <div style={L}>Chọn file CSV</div>
          <div onClick={()=>fileRef.current?.click()} style={{border:'2px dashed #cbd5e1',borderRadius:10,padding:'24px 16px',textAlign:'center',cursor:'pointer',background:'#f8fafc'}}>
            <div style={{fontSize:24,marginBottom:6}}>📂</div>
            <div style={{fontSize:13,color:'#64748B'}}>{rows.length>0?`Đã chọn ${rows.length} dòng — nhấn để đổi file`:'Nhấn để chọn file .csv hoặc .xlsx'}</div>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,text/csv" style={{display:'none'}} onChange={handleFile}/>
        </div>
        {rows.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{...L,marginBottom:8}}>Xem trước — {rows.length} dòng</div>
            <div style={{border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',maxHeight:180,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#f1f5f9'}}>
                  {['Tên hàng','Nhóm','Giá bán','Tồn kho'].map(h=><th key={h} style={{padding:'6px 10px',textAlign:'left',fontWeight:600,color:'#475569',borderBottom:'1px solid #e2e8f0'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {rows.slice(0,8).map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={{padding:'6px 10px',color:'#334155'}}>{r.name}</td>
                      <td style={{padding:'6px 10px',color:'#64748B'}}>{r.group}</td>
                      <td style={{padding:'6px 10px'}}>{r.sell_price?.toLocaleString('vi-VN')}</td>
                      <td style={{padding:'6px 10px'}}>{r.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length>8&&<div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>...và {rows.length-8} dòng khác</div>}
          </div>
        )}
        {err&&<div style={{padding:'8px 12px',background:'#fef2f2',color:'#dc2626',borderRadius:8,fontSize:13,marginBottom:12}}>{err}</div>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <button onClick={onClose} style={{border:'1px solid #e2e8f0',background:'#fff',borderRadius:8,height:36,padding:'0 20px',fontSize:13,cursor:'pointer',color:'#49636F'}}>Hủy</button>
          <button onClick={handleImport} disabled={rows.length===0||isPending} style={{...btnGreen,borderRadius:8,height:36,padding:'0 24px',opacity:rows.length===0?.5:1}}>
            {isPending?'Đang nhập...':rows.length>0?`Nhập ${rows.length} hàng`:'Nhập'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function NumInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))
  useEffect(() => { setRaw(value === 0 ? '' : String(value)) }, [value])
  return (
    <input
      style={{ ...inp, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'textfield' } as React.CSSProperties}
      inputMode="numeric"
      value={raw}
      placeholder={placeholder ?? '0'}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9]/g, '')
        setRaw(v)
        onChange(v === '' ? 0 : Number(v))
      }}
    />
  )
}

function ImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try { onChange(await resizeImage(file)) } catch { }
    setLoading(false)
    e.target.value = ''
  }
  return (
    <div onClick={() => ref.current?.click()} style={{
      width: '100%', height: 100, border: '2px dashed #cbd5e1', borderRadius: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', gap: 8, background: '#f8fafc', position: 'relative', overflow: 'hidden',
    }}>
      {loading ? (
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Đang xử lý...</span>
      ) : value ? (
        <>
          <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
            <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Đổi ảnh</span>
          </div>
        </>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>Nhấn để tải ảnh lên</span>
        </>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

function ProductModal({ initial, onClose, onSaved }: {
  initial?: Product | null; onClose: () => void; onSaved: (p: Product) => void
}) {
  const isEdit = !!initial
  const [form, setForm] = useState(initial ? {
    name: initial.name, group: initial.group, type: initial.type,
    sell_price: initial.sell_price, cost_price: initial.cost_price,
    stock: initial.stock, min_stock: initial.min_stock, max_stock: initial.max_stock,
    location: initial.location ?? '', brand: initial.brand ?? '',
    supplier_id: initial.supplier_id ?? '',
    can_sell_direct: initial.can_sell_direct, has_points: initial.has_points,
    note: initial.note ?? '', image_url: initial.image_url ?? '',
    expected_order: initial.expected_order ?? 0,
    unit: (initial as any).unit ?? '',
    branch_stock: (initial as any).branch_stock ?? { 'Chi nhánh trung tâm': initial.stock } as Record<string, number>,
  } : emptyForm())

  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function setBranchStock(branch: string, val: number) {
    setForm(f => ({ ...f, branch_stock: { ...f.branch_stock, [branch]: val } }))
  }

  function handleSubmit() {
    setErr('')
    startTransition(async () => {
      try {
        const payload = {
          ...form,
          sell_price: Number(form.sell_price), cost_price: Number(form.cost_price),
          stock: Number(form.stock), min_stock: Number(form.min_stock), max_stock: Number(form.max_stock),
          expected_order: Number(form.expected_order),
        }
        if (isEdit && initial) {
          await updateProductUseCase(initial.id, payload)
          onSaved({ ...initial, ...payload })
        } else {
          await addProductUseCase(payload)
          onSaved({ id: '', code: '', name: form.name, created_at: '', supplier_name: null, barcode: (form as any).barcode ?? '', unit: (form as any).unit ?? '', ...payload } as Product)
        }
        onClose()
      } catch (e: any) { setErr(e.message) }
    })
  }

  const L: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }

  return (
    <Overlay>
      <div style={{ background: '#fff', borderRadius: 16, width: 620, maxHeight: '92vh', overflowY: 'auto', padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>{isEdit ? 'Cập nhật hàng hóa' : 'Thêm hàng hóa mới'}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <div style={L}>Tên hàng *</div>
            <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ví dụ: Quýt Mỹ (Kg)" />
          </div>
          <div>
            <div style={L}>Nhóm hàng</div>
            <select style={inp} value={form.group} onChange={e => set('group', e.target.value as ProductGroup)}>
              {GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <div style={L}>Loại hàng</div>
            <select style={inp} value={form.type} onChange={e => set('type', e.target.value as ProductType)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><div style={L}>Giá bán (₫)</div><NumInput value={form.sell_price} onChange={v => set('sell_price', v)} /></div>
          <div><div style={L}>Giá vốn (₫)</div><NumInput value={form.cost_price} onChange={v => set('cost_price', v)} /></div>
          <div><div style={L}>Tồn kho hiện tại</div><NumInput value={form.stock} onChange={v => set('stock', v)} /></div>
          <div><div style={L}>Dự kiến đặt hàng</div><NumInput value={form.expected_order} onChange={v => set('expected_order', v)} /></div>
          <div><div style={L}>Định mức tồn Min</div><NumInput value={form.min_stock} onChange={v => set('min_stock', v)} /></div>
          <div><div style={L}>Định mức tồn Max</div><NumInput value={form.max_stock} onChange={v => set('max_stock', v)} /></div>
          <div><div style={L}>Thương hiệu</div><input style={inp} value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Chưa có" /></div>
          <div><div style={L}>Đơn vị tính</div><input style={inp} value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="kg, quả, thùng, hộp..." /></div>
          <div><div style={L}>Vị trí kho</div><input style={inp} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Kệ 4, tủ 5" /></div>
          <div style={{ gridColumn: '1/-1' }}>
            <div style={L}>Nhà cung cấp (ID)</div>
            <input style={inp} value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} placeholder="Mã nhà cung cấp" />
          </div>

          {/* Upload ảnh */}
          <div style={{ gridColumn: '1/-1' }}>
            <div style={L}>Hình ảnh</div>
            <ImageUpload value={form.image_url} onChange={v => set('image_url', v)} />
          </div>

          <div style={{ gridColumn: '1/-1' }}>
            <div style={L}>Ghi chú</div>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ghi chú cho món hàng..."
              style={{ ...inp, height: 72, padding: '8px 10px', resize: 'none' }} />
          </div>

          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.can_sell_direct} onChange={e => set('can_sell_direct', e.target.checked)} />
              Bán trực tiếp
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.has_points} onChange={e => set('has_points', e.target.checked)} />
              Tích điểm
            </label>
          </div>
        </div>

        {err && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, height: 36, padding: '0 20px', fontSize: 13, cursor: 'pointer', color: '#49636F' }}>Hủy</button>
          <button onClick={handleSubmit} disabled={isPending} style={{ ...btnGreen, borderRadius: 8, height: 36, padding: '0 28px' }}>
            {isPending ? '...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function ExpandedRow({ product, onEdit }: { product: Product; onEdit: () => void }) {
  const [tab, setTab] = useState<'info' | 'stock'>('info')
  const L: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '20px' }
  const V: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: '#2A3437', lineHeight: '20px' }
  function Field({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={L}>{label}</div>
        <div style={{ ...V, color: color ?? V.color }}>{value ?? <span style={{ color: '#94A3B8' }}>Chưa có</span>}</div>
      </div>
    )
  }
  const branchStock: Record<string, number> = (product as any).branch_stock ?? { 'Chi nhánh trung tâm': product.stock }

  return (
    <div style={{ background: '#fff', borderLeft: '4px solid rgba(0,110,28,0.2)', borderRight: '4px solid rgba(0,110,28,0.2)', borderRadius: 8, padding: '9px 0' }}>
      <div style={{ display: 'flex', gap: 4, padding: '16px 32px 0' }}>
        {(['info', 'stock'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 24px', borderRadius: '4px 4px 0 0',
            border: tab === t ? '1px solid #F1F5F9' : 'none',
            borderBottom: tab === t ? '1px solid #fff' : 'none',
            background: '#fff', fontWeight: tab === t ? 600 : 500, fontSize: 12,
            cursor: 'pointer', color: tab === t ? '#006E1C' : '#566164',
          }}>
            {t === 'info' ? 'Thông tin' : 'Tồn kho'}
          </button>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #F1F5F9', padding: '32px', display: 'flex', gap: 32 }}>
        {/* Image */}
        <div style={{ width: 256, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ width: 256, height: 256, background: '#E1EAEC', border: '1px solid #F1F5F9', borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {product.image_url
              ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 48 }}>📦</span>}
            <div style={{ position: 'absolute', bottom: 9, right: 9, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '4px 8px', fontSize: 10, fontWeight: 600, color: '#006E1C' }}>Ảnh chính</div>
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: product.can_sell_direct ? '#16A34A' : '#94A3B8' }} />
              <span style={{ fontSize: 12, color: product.can_sell_direct ? '#2A3437' : '#94A3B8' }}>{product.can_sell_direct ? 'Bán trực tiếp' : 'Không bán trực tiếp'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: product.has_points ? '#16A34A' : '#9E422C' }} />
              <span style={{ fontSize: 12, color: product.has_points ? '#2A3437' : '#566164' }}>{product.has_points ? 'Có tích điểm' : 'Không tích điểm'}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 24, color: '#0F172A', marginBottom: 24 }}>{product.name}</div>

          {tab === 'info' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px 0', marginBottom: 24 }}>
                <Field label="Mã hàng" value={<span style={{ fontFamily: 'monospace' }}>{product.code}</span>} />
                <Field label="Nhóm hàng" value={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColors[product.group] ?? '#94A3B8', display: 'inline-block' }} />{product.group}</span>} />
                <Field label="Loại hàng" value={product.type} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px 0', marginBottom: 24 }}>
                <Field label="Thương hiệu" value={product.brand} />
                <Field label="Đơn vị tính" value={(product as any).unit} />
                <Field label="Vị trí" value={product.location} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '24px 0', marginBottom: 24 }}>
                <Field label="Giá bán" value={<span style={{ color: '#006E1C', fontWeight: 600 }}>{fmt(product.sell_price)} ₫</span>} />
                <Field label="Giá vốn" value={`${fmt(product.cost_price)} ₫`} />
                <div />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Ghi chú</div>
                  <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 12, minHeight: 72, fontSize: 14, color: product.note ? '#2A3437' : '#6B7280' }}>{product.note || 'Ghi chú cho món hàng...'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Nhà cung cấp</div>
                  <div style={{ border: '1px solid #F1F5F9', borderRadius: 8, padding: 12, fontSize: 14, color: '#2A3437' }}>{product.supplier_name ?? product.supplier_id ?? <span style={{ color: '#94A3B8' }}>Chưa có</span>}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button style={{ border: 'none', background: 'none', borderRadius: 8, height: 36, padding: '0 20px', fontSize: 14, cursor: 'pointer', color: '#49636F', fontWeight: 600 }}>Hủy</button>
                    <button onClick={onEdit} style={{ background: '#006E1C', color: '#fff', border: 'none', borderRadius: 8, height: 36, padding: '0 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cập nhật</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Tồn kho hiện tại</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: stockColor(product) }}>{fmt(product.stock)}</div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Định mức Min</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#2A3437' }}>{fmt(product.min_stock)}</div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Định mức Max</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#2A3437' }}>{fmt(product.max_stock)}</div>
                </div>
              </div>

              {/* Bảng chi nhánh */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Tồn kho theo chi nhánh</div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px', background: '#dbeafe', padding: '10px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f' }}>Chi nhánh</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', textAlign: 'right' as const }}>Tồn kho</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a5f', textAlign: 'right' as const }}>Đặt hàng</span>
                  </div>
                  {/* Dòng tổng */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px', padding: '10px 16px', background: '#f0f9ff', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>—</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: stockColor(product), textAlign: 'right' as const }}>{fmt(product.stock)}</span>
                    <span style={{ fontSize: 13, color: '#64748B', textAlign: 'right' as const }}>{product.expected_order ? fmt(product.expected_order) : '0'}</span>
                  </div>
                  {BRANCHES.map((branch, i) => (
                    <div key={branch} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px', padding: '10px 16px', background: i % 2 === 0 ? '#fff' : '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 13, color: '#334155' }}>{branch}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'right' as const }}>{fmt(branchStock[branch] || 0)}</span>
                      <span style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'right' as const }}>0</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TableRow({ product, selected, expanded, onSelect, onExpand, onEdit }: {
  product: Product; selected: boolean; expanded: boolean
  onSelect: () => void; onExpand: () => void; onEdit: () => void
}) {
  return (
    <>
      <div onClick={onExpand} style={{ display: 'grid', gridTemplateColumns: '48px 40px 128px 1fr 112px 112px 96px 96px', borderTop: '1px solid #F3F4F6', background: '#fff', cursor: 'pointer', transition: 'background 0.12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
        onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 12px' }} onClick={e => { e.stopPropagation(); onSelect() }}>
          <input
  type="checkbox"
  checked={selected}
  onChange={e => {
    e.stopPropagation()
    onSelect()
  }}
  style={{ width: 16, height: 16, accentColor: '#006E1C', cursor: 'pointer' }}
/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '20px 12px' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: '0.15s' }}>
            <path d="M6 4l4 4-4 4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid #E5E7EB', overflow: 'hidden', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            {product.image_url ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
          </div>
          <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{product.code}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 12px' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#2563EB' }}>{product.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '18px 12px' }}>
          <span style={{ fontSize: 14, color: '#333' }}>{fmt(product.sell_price)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '18px 12px' }}>
          <span style={{ fontSize: 14, color: '#6B7280' }}>{fmt(product.cost_price)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '18px 12px' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: stockColor(product) }}>{fmt(product.stock)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 12px' }}>
          {product.expected_order
            ? <span style={{ fontSize: 12, color: '#EF4444' }}>+{fmt(product.expected_order)}</span>
            : <span style={{ fontSize: 14, color: '#9CA3AF' }}>—</span>}
        </div>
      </div>
      {expanded && <div style={{ padding: '0 8px', background: '#fff' }}><ExpandedRow product={product} onEdit={onEdit} /></div>}
    </>
  )
}

function Sidebar({ typeFilter, setTypeFilter, groupFilter, setGroupFilter, stockFilter, setStockFilter, onReset }: {
  typeFilter: string; setTypeFilter: (v: string) => void
  groupFilter: string; setGroupFilter: (v: string) => void
  stockFilter: string; setStockFilter: (v: string) => void
  onReset: () => void
}) {
  const sCard: React.CSSProperties = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }
  const sHead: React.CSSProperties = { fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 12 }
  const sLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#333', cursor: 'pointer', padding: '2px 0' }
  return (
    <aside style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#333', paddingBottom: 16 }}>Hàng hóa</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid #2563EB', borderRadius: 12, background: '#fff', color: '#2563EB', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
          Đặt lại bộ lọc
        </button>
      </div>
      <div style={sCard}>
        <div style={sHead}>Loại hàng</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TYPES.map(t => (
            <label key={t} style={sLabel}>
              <input type="checkbox" checked={typeFilter === t} onChange={() => setTypeFilter(typeFilter === t ? '' : t)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div style={sCard}>
        <div style={sHead}>Nhóm hàng</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GROUPS.map(g => (
            <div key={g} onClick={() => setGroupFilter(groupFilter === g ? '' : g)} style={{ padding: '6px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 14, color: '#333', background: groupFilter === g ? '#F3F4F6' : 'transparent', fontWeight: groupFilter === g ? 500 : 400 }}>{g}</div>
          ))}
        </div>
      </div>
      <div style={sCard}>
        <div style={sHead}>Tồn kho</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { val: 'all', label: 'Tất cả' },
            { val: 'below_min', label: 'Dưới định mức tồn' },
            { val: 'above_max', label: 'Vượt định mức tồn' },
            { val: 'in_stock', label: 'Còn hàng trong kho' },
            { val: 'out_of_stock', label: 'Hết hàng trong kho' },
          ].map(opt => (
            <label key={opt.val} style={sLabel}>
              <input type="radio" name="stock_filter" value={opt.val} checked={stockFilter === opt.val} onChange={() => setStockFilter(opt.val)} style={{ width: 16, height: 16, accentColor: '#2563EB' }} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </aside>
  )
}

export default function ProductTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  useEffect(() => { setSearch(searchParams.get('q') ?? ''); setPage(1) }, [searchParams])
  const [typeFilter, setTypeFilter]   = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [page, setPage]               = useState(1)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isPending, startTransition]  = useTransition()

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase())) return false
    if (typeFilter  && p.type  !== typeFilter)  return false
    if (groupFilter && p.group !== groupFilter) return false
    if (stockFilter === 'out_of_stock' && p.stock > 0)          return false
    if (stockFilter === 'in_stock'     && p.stock === 0)         return false
    if (stockFilter === 'below_min'    && p.stock >= p.min_stock) return false
    if (stockFilter === 'above_max'    && p.stock <= p.max_stock) return false
    return true
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER))
  const paginated  = filtered.slice((page - 1) * PER, page * PER)

  function toggleSelect(id: string) { setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleAll() {
    const ids = paginated.map(p => p.id)
    const all = ids.every(id => selected.has(id))
    setSelected(s => { const n = new Set(s); ids.forEach(id => all ? n.delete(id) : n.add(id)); return n })
  }
  function handleSaved(saved: Product) {
    setProducts(prev => { const i = prev.findIndex(p => p.id === saved.id); if (i >= 0) { const n = [...prev]; n[i] = saved; return n } return [saved, ...prev] })
    setShowAdd(false); setEditProduct(null)
  }
  function handleDelete() {
    startTransition(async () => {
      await deleteProductsUseCase([...selected])
      setProducts(prev => prev.filter(p => !selected.has(p.id)))
      setSelected(new Set()); setShowConfirmDelete(false)
    })
  }

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, minHeight: '100vh', background: '#f9fafb' }}>
      <Sidebar typeFilter={typeFilter} setTypeFilter={v => { setTypeFilter(v); setPage(1) }}
        groupFilter={groupFilter} setGroupFilter={v => { setGroupFilter(v); setPage(1) }}
        stockFilter={stockFilter} setStockFilter={v => { setStockFilter(v); setPage(1) }}
        onReset={() => { setTypeFilter(''); setGroupFilter(''); setStockFilter('all'); setSearch(''); setPage(1) }} />

      <div style={{ flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 512 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Theo mã, tên hàng"
              style={{ width: '100%', height: 38, border: '1px solid #E5E7EB', borderRadius: 12, paddingLeft: 40, paddingRight: 16, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 12 }}>
            <button onClick={() => setShowAdd(true)} style={{ ...btnGreen, borderRadius: 12, height: 36, padding: '0 16px', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Thêm hàng
            </button>
            <button onClick={() => setShowImport(true)} style={{ ...btnGreen, borderRadius: 12, height: 36, padding: '0 16px', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>Nhập file
            </button>
            <button onClick={() => exportToCSV(filtered)} style={{ ...btnGreen, borderRadius: 12, height: 36, padding: '0 16px', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Xuất file
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '48px 40px 128px 1fr 112px 112px 96px 96px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <input
  type="checkbox"
  checked={paginated.length > 0 && paginated.every(p => selected.has(p.id))}
  onChange={e => {
    e.stopPropagation()
    toggleAll()
  }}
  style={{ width: 16, height: 16, accentColor: '#006E1C', cursor: 'pointer' }}
/>
          </div>
          <div />
          {[{ label: 'Mã hàng', align: 'left' }, { label: 'Tên hàng', align: 'left' }, { label: 'Giá bán', align: 'right' }, { label: 'Giá vốn', align: 'right' }, { label: 'Tồn kho', align: 'right' }, { label: 'Dự kiến hết hàng', align: 'left' }].map(col => (
            <div key={col.label} style={{ padding: 12, fontSize: 14, fontWeight: 600, color: '#374151', textAlign: col.align as any }}>{col.label}</div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {paginated.length === 0
            ? <div style={{ textAlign: 'center', padding: 48, color: '#94A3B8', fontSize: 14 }}>Không tìm thấy hàng hóa phù hợp</div>
            : paginated.map(p => (
              <TableRow key={p.id} product={p} selected={selected.has(p.id)} expanded={expandedId === p.id}
                onSelect={() => toggleSelect(p.id)}
                onExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                onEdit={() => { setEditProduct(p); setExpandedId(null) }} />
            ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{Math.min((page-1)*PER+1, filtered.length)}–{Math.min(page*PER, filtered.length)} / {filtered.length} hàng hóa</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <PgBtn disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</PgBtn>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => <PgBtn key={n} active={n === page} onClick={() => setPage(n)}>{n}</PgBtn>)}
            {totalPages > 5 && <span style={{ fontSize: 12, color: '#6B7280' }}>…</span>}
            <PgBtn disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</PgBtn>
          </div>
        </div>
      </div>

      {showAdd     && <ProductModal onClose={() => setShowAdd(false)} onSaved={handleSaved} />}
      {showImport  && <ImportModal onClose={() => setShowImport(false)} onImported={() => { window.location.reload() }} />}
      {editProduct && <ProductModal initial={editProduct} onClose={() => setEditProduct(null)} onSaved={handleSaved} />}
      {showConfirmDelete && <ConfirmDeleteModal count={selected.size} isPending={isPending} onConfirm={handleDelete} onCancel={() => setShowConfirmDelete(false)} />}
      <DeleteBar count={selected.size} onDelete={() => setShowConfirmDelete(true)} />
    </div>
  )
}