require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function seed() {
  console.log('🌱 Seeding Huế locations...');
  await pool.query('TRUNCATE wards, districts RESTART IDENTITY CASCADE');

  const districts = [
    { code: 'THH', name: 'Thành Phố Huế', zone: 1, fee: 15000 },
    { code: 'HTN', name: 'Thị Xã Hương Thủy', zone: 2, fee: 25000 },
    { code: 'HTP', name: 'Huyện Hương Trà', zone: 2, fee: 25000 },
    { code: 'PDC', name: 'Huyện Phong Điền', zone: 3, fee: 35000 },
    { code: 'PLO', name: 'Huyện Phú Lộc', zone: 3, fee: 35000 },
    { code: 'QDI', name: 'Huyện Quảng Điền', zone: 3, fee: 35000 }
  ];

  const wardLists = {
    THH: ['Vỹ Dạ','Phú Hội','Phú Nhật','Phú Thượng','Thuỷ Biền','Thuỷ Dương','Thuỷ Lương','Thuỷ Xuân','An Đông','An Cựu','An Tây','Hương Sơ','Hương Long','Hương Vinh','Thủy Bằng','Kim Long','Tây Lộc','Đập Đá','Gia Hội','Huyền Khê','Trường An','Phú Hòa','Phú Cát','Thuận Lộc','Phú Bình','Vạn Xuân','Bình Thành'],
    HTN: ['Phú Bài','Thủy Châu','Thủy Dương','Thủy Giang','Thủy Phương','Thủy Phù','Thủy Tân','Thủy Thọ','Thủy Văn','Xuân Phú','Sịa','Thanh Mỹ','Cồn Hến','Hương Phong','Hương Toàn','Hương Bình'],
    HTP: ['Hương Xuân','Hương Hồ','Hương Vân','Hương Thủy','Hương Ngọc','Hương Bắc','Hương Cần','Hương Lập','Hương Phú','Hương Sơ','Bình Tiến','Húng Nhượng','Bình Thành','Hương Giang','Hương An','Hương Thượng'],
    PDC: ['Phong Điền','Điền Hải','Điền Hoà','Điền Hưng','Điền Lộc','Điền Mỹ','Điền Minh','Điền Phong','Phong An','Phong Bình','Phong Chu','Phong Hiền','Phong Hoà','Phong Hải','Phong Mỹ','Phong Sơn','Phong Thuỷ','Phong Xuân','Phong Yên'],
    PLO: ['Phú Lộc','Lộc Bổn','Lộc Bình','Lộc Điền','Lộc Hoà','Lộc Hưng','Lộc Nga','Lộc Sơn','Lộc Thắng','Lộc Thuỷ','Lộc Tiến','Lộc Trì','Xuân Lộc','Lộc Vĩnh','Lộc Hà','Lộc Mỹ','Lộc Thạnh','Lộc An','Lộc Khánh','Lộc Nam'],
    QDI: ['Quảng Điền','Quảng Ngãi','Quảng Thọ','Quảng Thành','Quảng Phú','Quảng Vinh','Quảng Phước','Quảng An','Quảng Công','Quảng Nhân','Quảng Lợi','Quảng Phong']
  };

  let totalWards = 0;
  for (const d of districts) {
    const r = await pool.query('INSERT INTO districts (code,name,zone,shipping_fee) VALUES ($1,$2,$3,$4) RETURNING id', [d.code,d.name,d.zone,d.fee]);
    const did = r.rows[0].id;
    const seen = {};
    for (const w of wardLists[d.code]) {
      // Use district code as prefix + safe ward name to guarantee uniqueness
      const safeWard = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').substring(0, 20);
      const code = `${d.code}-${safeWard}`;
      await pool.query('INSERT INTO wards (district_id,code,name) VALUES ($1,$2,$3)', [did, code, w]);
      totalWards++;
    }
    console.log(`  ✅ ${d.name} (Zone ${d.zone}) - ${d.fee.toLocaleString()}đ`);
  }
  console.log(`\n✅ Done: ${districts.length} districts, ${totalWards} wards`);
}

seed().then(()=>{pool.end();process.exit(0)}).catch(e=>{console.error('❌',e.message);pool.end();process.exit(1)});
