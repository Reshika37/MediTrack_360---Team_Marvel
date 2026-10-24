import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'meditrack.db');
export const db = new DatabaseSync(DB_PATH);

export function initDatabase() {
  // Pragmas
  db.exec('PRAGMA foreign_keys = ON;');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'staff'))
    );
  `);

  // Medicines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      category TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      supplier TEXT NOT NULL,
      unit TEXT NOT NULL,
      minimum_stock INTEGER NOT NULL DEFAULT 10,
      notes TEXT
    );
  `);

  // Medicine Batches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medicine_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL,
      batch_number TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      purchase_date TEXT NOT NULL,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    );
  `);

  // Stock movements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      medicine_name TEXT NOT NULL,
      batch_number TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('Stock In', 'Stock Out', 'Adjustment')),
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reason TEXT NOT NULL,
      user_id INTEGER,
      staff_name TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );
  `);

  // Alerts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      medicine_name TEXT NOT NULL,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('expired', 'expiring_soon', 'warning', 'low_stock', 'out_of_stock')),
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'dismissed')),
      created_at TEXT NOT NULL
    );
  `);

  // Seed default data if users table is empty
  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount === 0) {
    seedDatabase();
  }
}

export function seedDatabase() {
  // Clear existing
  db.exec('DELETE FROM alerts;');
  db.exec('DELETE FROM stock_movements;');
  db.exec('DELETE FROM medicine_batches;');
  db.exec('DELETE FROM medicines;');
  db.exec('DELETE FROM users;');

  // Insert Users
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
  insertUser.run('Dr. Anita Sharma', 'admin@meditrack.org', 'admin123', 'admin');
  insertUser.run('Ramesh Kumar', 'staff@meditrack.org', 'staff123', 'staff');

  // Insert Medicines & Batches
  const insertMed = db.prepare(`
    INSERT INTO medicines (name, generic_name, category, manufacturer, supplier, unit, minimum_stock, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = db.prepare(`
    INSERT INTO medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const meds = [
    {
      name: 'Paracetamol 650mg',
      generic_name: 'Acetaminophen',
      category: 'Analgesics / Antipyretics',
      manufacturer: 'Micro Labs Ltd',
      supplier: 'Apex Healthcare Distributors',
      unit: 'Tablets',
      minimum_stock: 25,
      notes: 'First-line medication for fever and mild to moderate pain.',
      batches: [
        { batch_number: 'PAR2309', expiry_date: '2026-11-10', quantity: 18, purchase_date: '2025-11-10' }, // 18 days left (Expiring soon)
        { batch_number: 'PAR2411', expiry_date: '2027-02-20', quantity: 150, purchase_date: '2026-02-20' }  // Healthy FEFO alternate
      ]
    },
    {
      name: 'Amoxicillin 500mg',
      generic_name: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      manufacturer: 'Cipla Ltd',
      supplier: 'MedRural Logistics',
      unit: 'Capsules',
      minimum_stock: 30,
      notes: 'Essential antibacterial for respiratory and bacterial infections.',
      batches: [
        { batch_number: 'AMX2405', expiry_date: '2026-10-09', quantity: 40, purchase_date: '2024-10-09' }, // Expired 14 days ago
        { batch_number: 'AMX2501', expiry_date: '2027-04-20', quantity: 95, purchase_date: '2026-04-20' }
      ]
    },
    {
      name: 'Metformin 500mg',
      generic_name: 'Metformin Hydrochloride',
      category: 'Antidiabetic',
      manufacturer: 'Sun Pharma',
      supplier: 'National Health Supply',
      unit: 'Tablets',
      minimum_stock: 25,
      notes: 'Type-2 diabetes management. High daily clinic demand.',
      batches: [
        { batch_number: 'MET332', expiry_date: '2027-09-15', quantity: 6, purchase_date: '2026-05-10' } // Low stock (6 < 25)
      ]
    },
    {
      name: 'Cetirizine 10mg',
      generic_name: 'Cetirizine Dihydrochloride',
      category: 'Antihistamines',
      manufacturer: 'Dr. Reddy’s Laboratories',
      supplier: 'Apex Healthcare Distributors',
      unit: 'Tablets',
      minimum_stock: 20,
      notes: 'Allergy relief. Completely stocked out due to seasonal surge.',
      batches: [
        { batch_number: 'CET901', expiry_date: '2027-05-20', quantity: 0, purchase_date: '2026-01-15' } // Out of Stock
      ]
    },
    {
      name: 'Omeprazole 20mg',
      generic_name: 'Omeprazole',
      category: 'Gastrointestinal',
      manufacturer: 'Alkem Laboratories',
      supplier: 'MedRural Logistics',
      unit: 'Capsules',
      minimum_stock: 20,
      notes: 'Acid reflux and peptic ulcer treatment.',
      batches: [
        { batch_number: 'OMP104', expiry_date: '2026-12-04', quantity: 35, purchase_date: '2025-12-04' } // 42 days left (31-50 days warning)
      ]
    },
    {
      name: 'Azithromycin 500mg',
      generic_name: 'Azithromycin',
      category: 'Antibiotics',
      manufacturer: 'Lupin Pharmaceuticals',
      supplier: 'National Health Supply',
      unit: 'Tablets',
      minimum_stock: 15,
      notes: 'Broad-spectrum macrolide antibiotic. Store in dry place below 25°C.',
      batches: [
        { batch_number: 'AZI882', expiry_date: '2027-08-19', quantity: 110, purchase_date: '2026-08-19' } // Healthy
      ]
    },
    {
      name: 'ORS Packet (Oral Rehydration Salts)',
      generic_name: 'Sodium Chloride + Dextrose + Potassium',
      category: 'Rehydration',
      manufacturer: 'FDC Limited',
      supplier: 'State Rural Mission Depot',
      unit: 'Packets',
      minimum_stock: 40,
      notes: 'Vital pediatric and adult dehydration prevention.',
      batches: [
        { batch_number: 'ORS019', expiry_date: '2027-06-30', quantity: 85, purchase_date: '2026-06-30' } // Healthy
      ]
    },
    {
      name: 'Diclofenac 50mg',
      generic_name: 'Diclofenac Sodium',
      category: 'Analgesics / NSAID',
      manufacturer: 'Zydus Cadila',
      supplier: 'Apex Healthcare Distributors',
      unit: 'Tablets',
      minimum_stock: 30,
      notes: 'Anti-inflammatory and acute musculoskeletal pain.',
      batches: [
        { batch_number: 'DIC552', expiry_date: '2027-01-26', quantity: 12, purchase_date: '2026-01-26' } // Low stock (12 < 30)
      ]
    },
    {
      name: 'Salbutamol Inhaler 100mcg',
      generic_name: 'Albuterol / Salbutamol',
      category: 'Respiratory',
      manufacturer: 'Cipla Ltd',
      supplier: 'MedRural Logistics',
      unit: 'Inhalers',
      minimum_stock: 10,
      notes: 'Bronchodilator for acute asthma attacks.',
      batches: [
        { batch_number: 'SAL441', expiry_date: '2026-11-20', quantity: 8, purchase_date: '2025-11-20' } // 28 days left & Low stock (8 < 10)
      ]
    },
    {
      name: 'Atorvastatin 20mg',
      generic_name: 'Atorvastatin Calcium',
      category: 'Cardiovascular',
      manufacturer: 'Torrent Pharmaceuticals',
      supplier: 'National Health Supply',
      unit: 'Tablets',
      minimum_stock: 20,
      notes: 'Cholesterol regulation and cardiovascular risk prevention.',
      batches: [
        { batch_number: 'ATO770', expiry_date: '2027-03-22', quantity: 60, purchase_date: '2026-03-22' } // Healthy
      ]
    },
    {
      name: 'Ciprofloxacin 500mg',
      generic_name: 'Ciprofloxacin Hydrochloride',
      category: 'Antibiotics',
      manufacturer: 'Bayer Pharmaceuticals',
      supplier: 'Apex Healthcare Distributors',
      unit: 'Tablets',
      minimum_stock: 15,
      notes: 'Fluoroquinolone antibiotic for urinary tract and gastrointestinal infections.',
      batches: [
        { batch_number: 'CIP202', expiry_date: '2026-11-30', quantity: 22, purchase_date: '2025-11-30' } // 38 days left (31-50 days)
      ]
    },
    {
      name: 'Pantoprazole 40mg',
      generic_name: 'Pantoprazole Sodium',
      category: 'Gastrointestinal',
      manufacturer: 'Sun Pharma',
      supplier: 'MedRural Logistics',
      unit: 'Tablets',
      minimum_stock: 20,
      notes: 'Proton-pump inhibitor for acid suppression.',
      batches: [
        { batch_number: 'PAN909', expiry_date: '2027-05-30', quantity: 75, purchase_date: '2026-05-30' } // Healthy
      ]
    }
  ];

  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (batch_id, medicine_name, batch_number, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, staff_name, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  meds.forEach(med => {
    const medRes = insertMed.run(
      med.name,
      med.generic_name,
      med.category,
      med.manufacturer,
      med.supplier,
      med.unit,
      med.minimum_stock,
      med.notes
    );
    const medId = medRes.lastInsertRowid;

    med.batches.forEach(b => {
      const bRes = insertBatch.run(medId, b.batch_number, b.expiry_date, b.quantity, b.purchase_date);
      const batchId = bRes.lastInsertRowid;

      // Seed initial movement record
      insertMovement.run(
        batchId,
        med.name,
        b.batch_number,
        'Stock In',
        b.quantity,
        0,
        b.quantity,
        'Initial stock intake & batch registration',
        1,
        'Dr. Anita Sharma',
        new Date(b.purchase_date).toISOString()
      );
    });
  });

  // Recent operational movements
  insertMovement.run(
    1,
    'Paracetamol 650mg',
    'PAR2309',
    'Stock Out',
    4,
    22,
    18,
    'Dispensed to rural outpatient OPD (Fever ward)',
    2,
    'Ramesh Kumar',
    new Date(Date.now() - 3600000 * 2).toISOString()
  );

  insertMovement.run(
    8,
    'Diclofenac 50mg',
    'DIC552',
    'Stock Out',
    8,
    20,
    12,
    'Emergency clinic trauma dressing patient',
    2,
    'Ramesh Kumar',
    new Date(Date.now() - 3600000 * 5).toISOString()
  );

  insertMovement.run(
    4,
    'Cetirizine 10mg',
    'CET901',
    'Stock Out',
    10,
    10,
    0,
    'Seasonal pollen epidemic community distribution',
    2,
    'Ramesh Kumar',
    new Date(Date.now() - 3600000 * 24).toISOString()
  );

  // Regenerate alerts
  refreshAlerts();
}

export function refreshAlerts() {
  db.exec("DELETE FROM alerts WHERE status != 'resolved'");

  const today = new Date('2026-10-23T00:00:00Z');
  const insertAlert = db.prepare(`
    INSERT INTO alerts (batch_id, medicine_name, alert_type, message, status, created_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `);

  // Query batches with medicine info
  const batches = db.prepare(`
    SELECT b.id as batch_id, b.batch_number, b.expiry_date, b.quantity,
           m.id as medicine_id, m.name as medicine_name, m.minimum_stock
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
  `).all() as Array<{
    batch_id: number;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    medicine_id: number;
    medicine_name: string;
    minimum_stock: number;
  }>;

  // Medicine totals for stock check
  const medTotals: Record<number, { name: string; totalQty: number; minStock: number; batches: typeof batches }> = {};

  batches.forEach(b => {
    if (!medTotals[b.medicine_id]) {
      medTotals[b.medicine_id] = {
        name: b.medicine_name,
        totalQty: 0,
        minStock: b.minimum_stock,
        batches: []
      };
    }
    medTotals[b.medicine_id].totalQty += b.quantity;
    medTotals[b.medicine_id].batches.push(b);

    const expDate = new Date(b.expiry_date + 'T00:00:00Z');
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      insertAlert.run(
        b.batch_id,
        b.medicine_name,
        'expired',
        `${b.medicine_name} — Batch ${b.batch_number} has expired (${Math.abs(diffDays)} days ago). Do not dispense!`,
        new Date().toISOString()
      );
    } else if (diffDays <= 30) {
      insertAlert.run(
        b.batch_id,
        b.medicine_name,
        'expiring_soon',
        `${b.medicine_name} — Batch ${b.batch_number} expires in ${diffDays} days. Prioritize FEFO dispensing!`,
        new Date().toISOString()
      );
    } else if (diffDays <= 50) {
      insertAlert.run(
        b.batch_id,
        b.medicine_name,
        'warning',
        `${b.medicine_name} — Batch ${b.batch_number} expires in ${diffDays} days (under 50 days threshold).`,
        new Date().toISOString()
      );
    }
  });

  // Check low stock & out of stock across whole medicine inventory
  Object.values(medTotals).forEach(m => {
    if (m.totalQty === 0) {
      insertAlert.run(
        m.batches[0]?.batch_id || null,
        m.name,
        'out_of_stock',
        `${m.name} is completely out of stock! Immediate supplier reorder required.`,
        new Date().toISOString()
      );
    } else if (m.totalQty <= m.minStock) {
      insertAlert.run(
        m.batches[0]?.batch_id || null,
        m.name,
        'low_stock',
        `${m.name} has reached critical low stock (${m.totalQty} units left vs min ${m.minStock}).`,
        new Date().toISOString()
      );
    }
  });
}
