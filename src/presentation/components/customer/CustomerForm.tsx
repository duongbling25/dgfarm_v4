'use client'
import { CustomerTier } from "@/domain/entities/Customer";

interface Props {
  title: string; name: string; phone: string; email: string; tier: CustomerTier;
  setName: (v: string) => void; setPhone: (v: string) => void; 
  setEmail: (v: string) => void; setTier: (v: CustomerTier) => void;
  onSave: () => void; onCancel: () => void; isPending: boolean;
}

export function CustomerForm({ title, name, phone, email, tier, setName, setPhone, setEmail, setTier, onSave, onCancel, isPending }: Props) {
  const inp: React.CSSProperties = { width: '100%', height: 34, padding: '0 10px', border: '1.5px solid #ddd', borderRadius: 7, fontSize: 13, outline: 'none', color: '#222', background: '#fafafa' };
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '20px 18px', width: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0E176E', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><input value={name} onChange={e => setName(e.target.value)} placeholder="Tên khách hàng *" style={inp} /></div>
        <div><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Số điện thoại" style={inp} /></div>
        <div><input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inp} /></div>
        <select value={tier} onChange={e => setTier(e.target.value as CustomerTier)} style={{ ...inp, cursor: 'pointer' }}>
          <option value="Đồng">Đồng</option><option value="Bạc">Bạc</option><option value="Vàng">Vàng</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onSave} disabled={isPending} style={{ flex: 1, height: 38, background: '#4BCC3A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}>Lưu</button>
        <button onClick={onCancel} style={{ flex: 1, height: 38, background: '#eee', border: 'none', borderRadius: 8 }}>Hủy</button>
      </div>
    </div>
  );
}