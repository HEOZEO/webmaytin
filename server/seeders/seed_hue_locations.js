require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/database');

async function seed() {
  console.log('🌱 Seeding Huế delivery locations...');

  // Xóa dữ liệu cũ
  await pool.query('TRUNCATE districts, wards RESTART IDENTITY CASCADE');

  // ===== ZONE 1: TP. Huế (0-3km) - 15,000đ =====
  const zone1Districts = [
    { code: 'THH', name: 'Thành Phố Huế' }
  ];

  // ===== ZONE 2: Quận Hương Thủy + Hương Trà (3-6km) - 25,000đ =====
  const zone2Districts = [
    { code: 'HTN', name: 'Thị Xã Hương Thủy' },
    { code: 'HTP', name: 'Huyện Hương Trà' }
  ];

  // ===== ZONE 3: Vùng ngoại vi (6-10km) - 35,000đ =====
  const zone3Districts = [
    { code: 'PDC', name: 'Huyện Phong Điền' },
    { code: 'PLO', name: 'Huyện Phú Lộc' },
    { code: 'QDI', name: 'Huyện Quảng Điền' }
  ];

  const allDistricts = [
    ...zone1Districts.map(d => ({ ...d, zone: 1, shipping_fee: 15000 })),
    ...zone2Districts.map(d => ({ ...d, zone: 2, shipping_fee: 25000 })),
    ...zone3Districts.map(d => ({ ...d, zone: 3, shipping_fee: 35000 }))
  ];

  const districtIds = {};

  for (const d of allDistricts) {
    const res = await pool.query(
      'INSERT INTO districts (code, name, zone, shipping_fee) VALUES ($1, $2, $3, $4) RETURNING id',
      [d.code, d.name, d.zone, d.shipping_fee]
    );
    districtIds[d.code] = res.rows[0].id;
    console.log(`  ✅ District: ${d.name} (Zone ${d.zone}) - ${d.shipping_fee.toLocaleString()}đ`);
  }

  // ===== WARDS DATA =====

  // ZONE 1: TP. Huế - 27 phường
  const hueWards = [
    'Vỹ Dạ', 'Phú Hội', 'Phú Nhật', 'Phú Thượng',
    'Thuỷ Biền', 'Thuỷ Dương', 'Thuỷ Lương', 'Thuỷ Xuân',
    'An Đông', 'An Cựu', 'An Tây', 'Hương Sơ', 'Hương Long',
    'Hương Vinh', 'Thủy Bằng', 'Kim Long', 'Tây Lộc',
    'Đập Đá', 'Gia Hội', 'Huyền Khê', 'Trường An',
    'Phú Hòa', 'Phú Cát', 'Thuận Lộc', 'Phú Bình',
    'Vạn Xuân', 'Bình Thành'
  ];

  // ZONE 2: Hương Thủy + Hương Trà - mỗi huyện ~15-20 xã/phường
  const huongThuyWards = [
    'Phú Bài', 'Thủy Châu', 'Thủy Dương', 'Thủy Giang',
    'Thủy Phương', 'Thủy Phù', 'Thủy Tân', 'Thủy Thọ',
    'Thủy Văn', 'Xuân Phú', 'Sịa', 'Thanh Mỹ',
    'Cồn Hến', 'Hương Phong', 'Hương Toàn', 'Hương Bình'
  ];

  const huongTraWards = [
    'Hương Xuân', 'Hương Hồ', 'Hương Vân', 'Hương Thủy',
    'Hương Ngọc', 'Hương Bắc', 'Hương Cần', 'Hương Lập',
    'Hương Phú', 'Hương Sơ', 'Bình Tiến', 'Húng Nhượng',
    'Bình Thành', 'Hương Giang', 'Hương An', 'Hương Thượng'
  ];

  // ZONE 3: Phong Điền + Phú Lộc + Quảng Điền
  const phongDienWards = [
    'Phong Điền', 'Điền Hải', 'Điền Hoà', 'Điền Hưng',
    'Điền Lộc', 'Điền Mỹ', 'Điền Minh', 'Điền Phong',
    'Phong An', 'Phong Bình', 'Phong Chu', 'Phong Hiền',
    'Phong Hoà', 'Phong Hải', 'Phong Mỹ', 'Phong Sơn',
    'Phong Thuỷ', 'Phong Xuân', 'Phong Yên'
  ];

  const phuLocWards = [
    'Phú Lộc', 'Lộc Bổn', 'Lộc Bình', 'Lộc Điền',
    'Lộc Hoà', 'Lộc Hưng', 'Lộc Nga', 'Lộc Sơn',
    'Lộc Thắng', 'Lộc Thuỷ', 'Lộc Tiến', 'Lộc Trì',
    'Xuân Lộc', 'Lộc Vĩnh', 'Lộc Hà', 'Lộc Mỹ',
    'Lộc Thạnh', 'Lộc An', 'Lộc Khánh', 'Lộc Nam'
  ];

  const quangDienWards = [
    'Quảng Điền', 'Quảng Ngãi', 'Quảng Thọ', 'Quảng Thành',
    'Quảng Phú', 'Quảng Vinh', 'Quảng Phước', 'Quảng An',
    'Quảng Công', 'Quảng Nhân', 'Quảng Lợi', 'Quảng Phong'
  ];

  const wardGroups = [
    { code: 'THH', wards: hueWards },
    { code: 'HTN', wards: huongThuyWards },
    { code: 'HTP', wards: huongTraWards },
    { code: 'PDC', wards: phongDienWards },
    { code: 'PLO', wards: phuLocWards },
    { code: 'QDI', wards: quangDienWards }
  ];

  let totalWards = 0;
  for (const group of wardGroups) {
    const seen = {};
    for (const wardName of group.wards) {
      const baseCode = wardName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 25);

      let code = baseCode;
      if (seen[baseCode]) {
        seen[baseCode]++;
        code = `${baseCode}-${seen[baseCode]}`;
      } else {
        seen[baseCode] = 1;
      }

      await pool.query(
        'INSERT INTO wards (district_id, code, name) VALUES ($1, $2, $3)',
        [districtIds[group.code], code, wardName]
      );
      totalWards++;
    }
  }

  console.log(`\n✅ Hoàn tất: ${allDistricts.length} quận/huyện, ${totalWards} phường/xã`);
  console.log('\n📍 Bảng phí giao hàng:');
  console.log('   Zone 1 (TP. Huế):        15,000đ');
  console.log('   Zone 2 (Hương Thủy/Trà): 25,000đ');
  console.log('   Zone 3 (Phong Điền/Phú Lộc/Quảng Điền): 35,000đ');
}

seed()
  .then(() => { pool.end(); process.exit(0); })
  .catch(err => { console.error('❌ Seeding failed:', err.message); pool.end(); process.exit(1); });
