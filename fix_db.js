require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixDB() {
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // Update phieu associated with 'Tiền mặt' to 'Tiền mặt tại két'
  console.log('Update tien_mat phieu...');
  let { error: e1 } = await supa.from('cashbook_phieu')
    .update({ tai_khoan_quy_id: '8072cc8e-e751-494b-a9f5-c008bcbe0cbf' })
    .eq('tai_khoan_quy_id', 'ff0f19c8-d1a1-4328-bab6-664dc4499882');
  console.log('tien_mat phieu update error:', e1);

  // Update phieu associated with bb029efd... to cc13bc7d...
  console.log('Update momo phieu...');
  let { error: e2 } = await supa.from('cashbook_phieu')
    .update({ tai_khoan_quy_id: 'cc13bc7d-adfe-41a2-a44d-6e6ffe765aea' })
    .eq('tai_khoan_quy_id', 'bb029efd-a16f-44eb-b1b7-a3fcfb65b6a3');
  console.log('momo phieu update error:', e2);

  console.log('Delete duplicate accounts...');
  // Delete the old duplicate accounts
  let { error: e3 } = await supa.from('cashbook_tai_khoan')
    .delete()
    .eq('id', 'ff0f19c8-d1a1-4328-bab6-664dc4499882');
  console.log('delete tien mat error:', e3);

  let { error: e4 } = await supa.from('cashbook_tai_khoan')
    .delete()
    .eq('id', 'bb029efd-a16f-44eb-b1b7-a3fcfb65b6a3');
  console.log('delete momo error:', e4);
  
  console.log('Fixed DB successfully.');
}
fixDB();
