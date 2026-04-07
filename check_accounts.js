
const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: accounts, error } = await supa.from('cashbook_tai_khoan').select('*');
  if (error) {
    console.log("Error:", error);
    return;
  }
  
  console.log("Accounts:");
  accounts?.forEach(a => {
    console.log(`- [${a.loai}] ${a.ten_tai_khoan} (ID: ${a.id}) (Mặc định: ${a.la_mac_dinh})`);
  });
}
check();
