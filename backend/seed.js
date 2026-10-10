// Optional demo data: npm run seed  (only runs when the stores table is empty)
require('dotenv').config();
const db = require('./src/db');
if (db.prepare('SELECT COUNT(*) c FROM stores').get().c > 0) { console.log('Data already exists, skipping seed.'); process.exit(0); }

const stores = [
  ['Zara', 0, 'Fashion', 3200, 180000, 'occupied'], ['Starbucks', 0, 'Food & Beverage', 900, 95000, 'occupied'],
  ['Apple Reseller', 1, 'Electronics', 2100, 150000, 'occupied'], ['PVR Cinemas', 2, 'Entertainment', 9000, 400000, 'occupied'],
  ['Book Corner', 1, 'Books', 1200, 60000, 'vacant'], ['Kids Zone', 2, 'Entertainment', 2500, 110000, 'maintenance'],
  ['Shoe Palace', 0, 'Fashion', 1500, 85000, 'vacant'], ['Food Court Unit A', 3, 'Food & Beverage', 1800, 120000, 'occupied'],
];
const insStore = db.prepare('INSERT INTO stores (name,floor,category,area_sqft,monthly_rent,status) VALUES (?,?,?,?,?,?)');
stores.forEach(s => insStore.run(...s));

const tenants = [
  ['Zara India Pvt Ltd', '9876543210', 'zara@example.com', 1, '2025-01-01', '2028-12-31'],
  ['Coffee Brands Ltd', '9876501234', 'sbux@example.com', 2, '2025-03-01', '2027-02-28'],
  ['Digital Retail LLP', '9123456780', 'apple@example.com', 3, '2024-06-01', '2027-05-31'],
  ['Cinema Entertainment', '9988776655', 'pvr@example.com', 4, '2023-09-01', '2028-08-31'],
  ['Foodies Hub', '9090909090', 'foodies@example.com', 8, '2025-07-01', '2027-06-30'],
];
const insTenant = db.prepare('INSERT INTO tenants (name,phone,email,store_id,lease_start,lease_end) VALUES (?,?,?,?,?,?)');
tenants.forEach(t => insTenant.run(...t));

const rent = [
  [1, 180000, '2026-09-05', '2026-09-03', 'paid'], [2, 95000, '2026-09-05', '2026-09-06', 'paid'],
  [3, 150000, '2026-10-05', null, 'overdue'], [4, 400000, '2026-10-05', '2026-10-04', 'paid'],
  [5, 120000, '2026-10-05', null, 'pending'], [1, 180000, '2026-10-05', null, 'pending'],
];
const insRent = db.prepare('INSERT INTO rent (tenant_id,amount,due_date,paid_date,status) VALUES (?,?,?,?,?)');
rent.forEach(r => insRent.run(...r));

const parking = [
  ['KA01AB1234', 'A-12', 'car', '2026-10-09T10:15', null, 0, 'parked'], ['KA05MN4521', 'B-03', 'car', '2026-10-09T11:40', null, 0, 'parked'],
  ['KA03XY9087', 'C-21', 'bike', '2026-10-08T17:00', '2026-10-08T20:30', 40, 'exited'],
  ['KA51ZZ1122', 'A-05', 'car', '2026-10-08T12:10', '2026-10-08T16:45', 120, 'exited'],
];
const insPark = db.prepare('INSERT INTO parking (vehicle_number,slot,vehicle_type,entry_time,exit_time,fee,status) VALUES (?,?,?,?,?,?,?)');
parking.forEach(p => insPark.run(...p));
console.log('Demo data added.');
