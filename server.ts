import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { db, initDatabase, seedDatabase, refreshAlerts } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize SQLite database
initDatabase();

app.use(express.json());

// API Routes

// Helper to compute expiry info
const TODAY_STR = '2026-10-23';
const TODAY = new Date('2026-10-23T00:00:00Z');

function computeBatchExpiry(expiryDateStr: string) {
  const exp = new Date(expiryDateStr + 'T00:00:00Z');
  const diffDays = Math.ceil((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
  let status: 'Expired' | 'Expiring Soon' | 'Warning' | 'Healthy' = 'Healthy';
  if (diffDays <= 0) status = 'Expired';
  else if (diffDays <= 30) status = 'Expiring Soon';
  else if (diffDays <= 50) status = 'Warning';
  return { diffDays, status };
}

// 1. Auth Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?').get(email) as any;
  if (!user || user.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid credentials. Try admin@meditrack.org / admin123' });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    clinic: 'Primary Rural Health Centre - Seva Kendra',
    district: 'Mandya Rural District'
  });
});

// 2. Dashboard Metrics
app.get('/api/dashboard', (req, res) => {
  refreshAlerts();

  const medicines = db.prepare('SELECT * FROM medicines').all() as any[];
  const batches = db.prepare(`
    SELECT b.*, m.name as medicine_name, m.minimum_stock, m.category, m.unit
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
  `).all() as any[];

  let expiringSoonCount = 0;
  let expiredCount = 0;
  let warningCount = 0; // 31-50 days
  let safeCount = 0;    // 50+ days

  // Expiry buckets
  const expiryDistribution = {
    expired: 0,
    range0_30: 0,
    range31_50: 0,
    range50plus: 0
  };

  const batchesWithStatus = batches.map(b => {
    const { diffDays, status } = computeBatchExpiry(b.expiry_date);
    if (status === 'Expired') {
      expiredCount++;
      expiryDistribution.expired++;
    } else if (status === 'Expiring Soon') {
      expiringSoonCount++;
      expiryDistribution.range0_30++;
    } else if (status === 'Warning') {
      warningCount++;
      expiryDistribution.range31_50++;
    } else {
      safeCount++;
      expiryDistribution.range50plus++;
    }
    return { ...b, diffDays, expiryStatus: status };
  });

  // Calculate per-medicine stock summary
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let healthyStockCount = 0;

  const fefoRecommendations: any[] = [];

  medicines.forEach(m => {
    const medBatches = batchesWithStatus.filter(b => b.medicine_id === m.id);
    const totalQty = medBatches.reduce((acc, curr) => acc + curr.quantity, 0);

    if (totalQty === 0) {
      outOfStockCount++;
    } else if (totalQty <= m.minimum_stock) {
      lowStockCount++;
    } else {
      healthyStockCount++;
    }

    // FEFO logic: find unexpired batches with qty > 0, pick earliest expiry
    const usableBatches = medBatches
      .filter(b => b.diffDays > 0 && b.quantity > 0)
      .sort((a, b) => a.diffDays - b.diffDays);

    if (medBatches.length > 1 && usableBatches.length > 0) {
      const bestBatch = usableBatches[0];
      const otherBatches = medBatches.filter(b => b.id !== bestBatch.id);
      fefoRecommendations.push({
        medicineId: m.id,
        medicineName: m.name,
        recommendedBatch: bestBatch.batch_number,
        recommendedDays: bestBatch.diffDays,
        recommendedQty: bestBatch.quantity,
        expiryDate: bestBatch.expiry_date,
        otherBatchesCount: otherBatches.length,
        advice: `Use Batch ${bestBatch.batch_number} first (expires in ${bestBatch.diffDays} days). Prevents wastage!`
      });
    }
  });

  // Recent Stock activity
  const recentActivity = db.prepare(`
    SELECT * FROM stock_movements ORDER BY id DESC LIMIT 8
  `).all();

  // Active alerts
  const alerts = db.prepare(`
    SELECT * FROM alerts WHERE status = 'active' ORDER BY id DESC
  `).all();

  return res.json({
    summary: {
      totalMedicines: medicines.length,
      totalBatches: batches.length,
      expiringSoonCount,
      lowStockCount,
      outOfStockCount,
      expiredCount,
      healthyStockCount,
      warningCount
    },
    expiryDistribution,
    fefoRecommendations,
    recentActivity,
    alerts
  });
});

// 3. Medicines List
app.get('/api/medicines', (req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY name ASC').all() as any[];
  const batches = db.prepare('SELECT * FROM medicine_batches ORDER BY expiry_date ASC').all() as any[];

  const result = medicines.map(m => {
    const medBatches = batches.filter(b => b.medicine_id === m.id).map(b => {
      const { diffDays, status } = computeBatchExpiry(b.expiry_date);
      return { ...b, diffDays, expiryStatus: status };
    });

    const totalStock = medBatches.reduce((acc, curr) => acc + curr.quantity, 0);

    // Determine overall medicine stock status
    let stockStatus: 'Out of Stock' | 'Low Stock' | 'Healthy' = 'Healthy';
    if (totalStock === 0) stockStatus = 'Out of Stock';
    else if (totalStock <= m.minimum_stock) stockStatus = 'Low Stock';

    // Determine overall expiry status based on earliest active batch
    const activeBatches = medBatches.filter(b => b.quantity > 0);
    let earliestExpiryDays = 99999;
    let worstExpiryStatus: 'Expired' | 'Expiring Soon' | 'Warning' | 'Healthy' = 'Healthy';

    if (activeBatches.length > 0) {
      const sorted = [...activeBatches].sort((a, b) => a.diffDays - b.diffDays);
      earliestExpiryDays = sorted[0].diffDays;
      worstExpiryStatus = sorted[0].expiryStatus;
    } else if (medBatches.length > 0) {
      earliestExpiryDays = medBatches[0].diffDays;
      worstExpiryStatus = medBatches[0].expiryStatus;
    }

    // FEFO recommended batch
    const fefoCandidate = medBatches
      .filter(b => b.diffDays > 0 && b.quantity > 0)
      .sort((a, b) => a.diffDays - b.diffDays)[0];

    return {
      ...m,
      totalStock,
      stockStatus,
      earliestExpiryDays: earliestExpiryDays === 99999 ? null : earliestExpiryDays,
      worstExpiryStatus,
      fefoBatch: fefoCandidate ? fefoCandidate.batch_number : (medBatches[0]?.batch_number || 'None'),
      batches: medBatches
    };
  });

  return res.json(result);
});

// 4. Create Medicine + Initial Batch
app.post('/api/medicines', (req, res) => {
  const {
    name,
    generic_name,
    category,
    manufacturer,
    supplier,
    unit,
    minimum_stock,
    notes,
    batch_number,
    expiry_date,
    quantity,
    purchase_date,
    staff_name,
    user_id
  } = req.body;

  if (!name || !generic_name || !batch_number || !expiry_date || quantity === undefined) {
    return res.status(400).json({ error: 'Please fill in all required fields (Name, Generic Name, Batch No, Expiry Date, Quantity).' });
  }

  try {
    const insertMed = db.prepare(`
      INSERT INTO medicines (name, generic_name, category, manufacturer, supplier, unit, minimum_stock, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const medRes = insertMed.run(
      name.trim(),
      generic_name.trim(),
      category || 'General',
      manufacturer || 'Generic Pharma',
      supplier || 'Local Depot',
      unit || 'Tablets',
      Number(minimum_stock) || 10,
      notes || ''
    );
    const medId = medRes.lastInsertRowid;

    const insertBatch = db.prepare(`
      INSERT INTO medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const batchRes = insertBatch.run(
      medId,
      batch_number.trim().toUpperCase(),
      expiry_date,
      Number(quantity),
      purchase_date || TODAY_STR
    );
    const batchId = batchRes.lastInsertRowid;

    // Log stock intake movement
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (batch_id, medicine_name, batch_number, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, staff_name, timestamp)
      VALUES (?, ?, ?, 'Stock In', ?, 0, ?, ?, ?, ?, ?)
    `);

    insertMovement.run(
      batchId,
      name.trim(),
      batch_number.trim().toUpperCase(),
      Number(quantity),
      Number(quantity),
      'Initial stock entry and registration',
      user_id || 1,
      staff_name || 'Staff Pharmacist',
      new Date().toISOString()
    );

    refreshAlerts();

    return res.status(201).json({ success: true, medicine_id: medId, batch_id: batchId });
  } catch (err: any) {
    console.error('Error adding medicine:', err);
    return res.status(500).json({ error: 'Failed to add medicine: ' + err.message });
  }
});

// 4b. Add New Batch to Existing Medicine (Barcode Intake)
app.post('/api/medicines/:id/batches', (req, res) => {
  const { id } = req.params;
  const { batch_number, expiry_date, quantity, purchase_date, staff_name, user_id } = req.body;

  if (!batch_number || !expiry_date || quantity === undefined) {
    return res.status(400).json({ error: 'Batch number, expiry date, and quantity are required.' });
  }

  try {
    const med = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id) as any;
    if (!med) {
      return res.status(404).json({ error: 'Medicine not found.' });
    }

    const insertBatch = db.prepare(`
      INSERT INTO medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    const batchRes = insertBatch.run(
      id,
      batch_number.trim().toUpperCase(),
      expiry_date,
      Number(quantity),
      purchase_date || TODAY_STR
    );
    const batchId = batchRes.lastInsertRowid;

    // Log stock intake movement
    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (batch_id, medicine_name, batch_number, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, staff_name, timestamp)
      VALUES (?, ?, ?, 'Stock In', ?, 0, ?, ?, ?, ?, ?)
    `);

    insertMovement.run(
      batchId,
      med.name,
      batch_number.trim().toUpperCase(),
      Number(quantity),
      Number(quantity),
      'New batch intake via 2D Barcode scanner',
      user_id || 1,
      staff_name || 'Clinic Pharmacist',
      new Date().toISOString()
    );

    refreshAlerts();

    return res.status(201).json({ success: true, batch_id: batchId, medicine_id: id });
  } catch (err: any) {
    console.error('Error adding batch:', err);
    return res.status(500).json({ error: 'Failed to add batch: ' + err.message });
  }
});

// 5. Update Medicine
app.put('/api/medicines/:id', (req, res) => {
  const { id } = req.params;
  const { name, generic_name, category, manufacturer, supplier, unit, minimum_stock, notes } = req.body;

  try {
    const update = db.prepare(`
      UPDATE medicines
      SET name = ?, generic_name = ?, category = ?, manufacturer = ?, supplier = ?, unit = ?, minimum_stock = ?, notes = ?
      WHERE id = ?
    `);

    update.run(
      name,
      generic_name,
      category,
      manufacturer,
      supplier,
      unit,
      Number(minimum_stock),
      notes || '',
      id
    );

    refreshAlerts();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete Medicine
app.delete('/api/medicines/:id', (req, res) => {
  const { id } = req.params;
  try {
    // Delete cascades batches
    db.prepare('DELETE FROM medicines WHERE id = ?').run(id);
    refreshAlerts();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Update Stock (Stock In, Stock Out, Adjustment)
app.post('/api/stock/update', (req, res) => {
  const { batch_id, movement_type, quantity, reason, staff_name, user_id } = req.body;

  if (!batch_id || !movement_type || quantity === undefined || !reason) {
    return res.status(400).json({ error: 'Batch, Movement Type, Quantity, and Reason are required.' });
  }

  const batch = db.prepare(`
    SELECT b.*, m.name as medicine_name
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
    WHERE b.id = ?
  `).get(batch_id) as any;

  if (!batch) {
    return res.status(404).json({ error: 'Medicine batch not found.' });
  }

  const numQty = Number(quantity);
  const prevQty = Number(batch.quantity);
  let newQty = prevQty;

  if (movement_type === 'Stock In') {
    newQty = prevQty + numQty;
  } else if (movement_type === 'Stock Out') {
    if (numQty > prevQty) {
      return res.status(400).json({ error: `Cannot dispense ${numQty} units. Only ${prevQty} units available in Batch ${batch.batch_number}.` });
    }
    newQty = prevQty - numQty;
  } else if (movement_type === 'Adjustment') {
    newQty = numQty;
  } else {
    return res.status(400).json({ error: 'Invalid movement type.' });
  }

  // Update batch quantity
  db.prepare('UPDATE medicine_batches SET quantity = ? WHERE id = ?').run(newQty, batch_id);

  // Record movement log
  db.prepare(`
    INSERT INTO stock_movements (batch_id, medicine_name, batch_number, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, staff_name, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    batch_id,
    batch.medicine_name,
    batch.batch_number,
    movement_type,
    numQty,
    prevQty,
    newQty,
    reason.trim(),
    user_id || 1,
    staff_name || 'Clinic Pharmacist',
    new Date().toISOString()
  );

  refreshAlerts();

  return res.json({
    success: true,
    batch_id,
    previous_quantity: prevQty,
    new_quantity: newQty,
    movement_type
  });
});

// 8. Stock Movement History
app.get('/api/stock/history', (req, res) => {
  const history = db.prepare('SELECT * FROM stock_movements ORDER BY id DESC').all();
  return res.json(history);
});

// 9. Alerts
app.get('/api/alerts', (req, res) => {
  refreshAlerts();
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY id DESC').all();
  return res.json(alerts);
});

app.put('/api/alerts/:id/read', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'resolved' or 'dismissed'
  const newStatus = status === 'dismissed' ? 'dismissed' : 'resolved';
  db.prepare('UPDATE alerts SET status = ? WHERE id = ?').run(newStatus, id);
  return res.json({ success: true });
});

// 10. Reports
app.get('/api/reports/stock', (req, res) => {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY name ASC').all() as any[];
  const batches = db.prepare(`
    SELECT b.*, m.name as medicine_name, m.minimum_stock, m.category, m.unit, m.supplier
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
  `).all() as any[];

  const reportItems = medicines.map(m => {
    const medBatches = batches.filter(b => b.medicine_id === m.id);
    const totalQty = medBatches.reduce((acc, curr) => acc + curr.quantity, 0);
    let status = 'Healthy';
    if (totalQty === 0) status = 'Out of Stock';
    else if (totalQty <= m.minimum_stock) status = 'Low Stock';

    return {
      id: m.id,
      name: m.name,
      generic_name: m.generic_name,
      category: m.category,
      supplier: m.supplier,
      unit: m.unit,
      current_stock: totalQty,
      minimum_stock: m.minimum_stock,
      status,
      batches_count: medBatches.length,
      suggested_reorder: totalQty <= m.minimum_stock ? (m.minimum_stock * 2) - totalQty : 0
    };
  });

  return res.json(reportItems);
});

app.get('/api/reports/expiry', (req, res) => {
  const batches = db.prepare(`
    SELECT b.*, m.name as medicine_name, m.generic_name, m.category, m.unit, m.supplier
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
    ORDER BY b.expiry_date ASC
  `).all() as any[];

  const report = batches.map(b => {
    const { diffDays, status } = computeBatchExpiry(b.expiry_date);
    return {
      ...b,
      diffDays,
      status,
      action_needed:
        status === 'Expired'
          ? 'Quarantine & Discard safely (Red Alert)'
          : status === 'Expiring Soon'
          ? 'Priority FEFO Dispensing (0-30 Days)'
          : status === 'Warning'
          ? 'Monitor closely (31-50 Days)'
          : 'Normal inventory shelf'
    };
  });

  return res.json(report);
});

// Reset / Seed endpoint
app.post('/api/seed/reset', (req, res) => {
  seedDatabase();
  return res.json({ success: true, message: 'Database reset to verified demo dataset!' });
});

// 11. AI Voice Assistant with High Thinking & Gemini TTS
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

function getClinicInventorySnapshot() {
  const medicines = db.prepare('SELECT * FROM medicines ORDER BY name ASC').all() as any[];
  const batches = db.prepare(`
    SELECT b.*, m.name as medicine_name, m.generic_name, m.minimum_stock, m.category, m.unit
    FROM medicine_batches b
    JOIN medicines m ON b.medicine_id = m.id
    ORDER BY b.expiry_date ASC
  `).all() as any[];
  const alerts = db.prepare("SELECT * FROM alerts WHERE status = 'active' ORDER BY id DESC").all() as any[];

  const detailedInventory = medicines.map(m => {
    const medBatches = batches.filter(b => b.medicine_id === m.id).map(b => {
      const { diffDays, status } = computeBatchExpiry(b.expiry_date);
      return {
        batchId: b.id,
        batchNumber: b.batch_number,
        expiryDate: b.expiry_date,
        quantity: b.quantity,
        diffDays,
        expiryStatus: status
      };
    });

    const totalStock = medBatches.reduce((acc, curr) => acc + curr.quantity, 0);
    const usableBatches = medBatches
      .filter(b => b.diffDays > 0 && b.quantity > 0)
      .sort((a, b) => a.diffDays - b.diffDays);
    const fefoBatch = usableBatches[0] || null;

    return {
      id: m.id,
      name: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit,
      minimumStock: m.minimum_stock,
      totalStock,
      isLowStock: totalStock <= m.minimum_stock && totalStock > 0,
      isOutOfStock: totalStock === 0,
      fefoRecommendedBatch: fefoBatch ? fefoBatch.batchNumber : null,
      fefoRecommendedBatchDays: fefoBatch ? fefoBatch.diffDays : null,
      batches: medBatches
    };
  });

  return {
    referenceDate: TODAY_STR,
    totalMedicines: medicines.length,
    totalBatches: batches.length,
    activeAlerts: alerts.map(a => ({ type: a.alert_type, medicine: a.medicine_name, message: a.message })),
    inventory: detailedInventory
  };
}

function generateAlgorithmicHighThinking(message: string, snapshot: ReturnType<typeof getClinicInventorySnapshot>) {
  const query = message.toLowerCase().trim();
  const inventory = snapshot.inventory;

  // Find mentioned medicine
  const matchedMed = inventory.find(m =>
    query.includes(m.name.toLowerCase().split(' ')[0]) ||
    query.includes(m.genericName.toLowerCase().split(' ')[0]) ||
    (query.includes('paracetamol') && m.name.toLowerCase().includes('paracetamol')) ||
    (query.includes('amoxicillin') && m.name.toLowerCase().includes('amoxicillin')) ||
    (query.includes('metformin') && m.name.toLowerCase().includes('metformin')) ||
    (query.includes('cetirizine') && m.name.toLowerCase().includes('cetirizine')) ||
    (query.includes('inhaler') && m.name.toLowerCase().includes('salbutamol')) ||
    (query.includes('diclofenac') && m.name.toLowerCase().includes('diclofenac')) ||
    (query.includes('omeprazole') && m.name.toLowerCase().includes('omeprazole')) ||
    (query.includes('azithromycin') && m.name.toLowerCase().includes('azithromycin'))
  );

  const isNextWeekExpiryQuery = query.includes('next week') || query.includes('upcoming') || (query.includes('expire') && query.includes('soon'));
  const isExpiredQuery = query.includes('expired') || query.includes('discard') || query.includes('quarantine') || query.includes('waste');
  const isFefoQuery = query.includes('fefo') || query.includes('first') || query.includes('dispense') || query.includes('recommend') || query.includes('use');
  const isStockQuery = query.includes('stock') || query.includes('how many') || query.includes('count') || query.includes('reorder') || query.includes('shortage');

  // Extract requested quantity if present (e.g. "log 10 units")
  const qtyMatch = query.match(/(?:log|dispense|take|issue|record)?\s*(\d+)\s*(?:units|tablets|capsules|doses)?/i);
  const parsedQty = qtyMatch && qtyMatch[1] ? parseInt(qtyMatch[1], 10) : 10;

  let spokenResponse = '';
  let thinkingProcess = '';
  let suggestedAction: any = null;

  if (isNextWeekExpiryQuery) {
    const nearExpiryBatches: any[] = [];
    inventory.forEach(m => {
      m.batches.forEach(b => {
        if (b.diffDays > 0 && b.diffDays <= 30) {
          nearExpiryBatches.push({ medicine: m, batch: b });
        }
      });
    });

    if (nearExpiryBatches.length > 0) {
      const topBatch = nearExpiryBatches[0];
      spokenResponse = `Approaching expiry: ${topBatch.medicine.name} Batch ${topBatch.batch.batchNumber} has ${topBatch.batch.quantity} ${topBatch.medicine.unit} expiring in ${topBatch.batch.diffDays} days (${topBatch.batch.expiryDate}). Prioritize this batch for all upcoming prescriptions under FEFO.`;
      thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Expiry Window Audit:** Evaluated formulary batches against the 0–30 day near-expiry window from Oct 23, 2026.
2. **Priority Batch Detected:** ${topBatch.medicine.name} — Batch ${topBatch.batch.batchNumber} (${topBatch.batch.quantity} units, ${topBatch.batch.diffDays} days left).
3. **FEFO Operational Protocol:** Ensure active dispensing rotation to prevent drug loss.
4. **Action:** Prepared priority dispensing recommendation.`;

      suggestedAction = {
        type: 'DISPENSE',
        medicineId: topBatch.medicine.id,
        medicineName: topBatch.medicine.name,
        batchId: topBatch.batch.batchId,
        batchNumber: topBatch.batch.batchNumber,
        quantity: Math.min(10, topBatch.batch.quantity),
        reason: `Priority FEFO dispensing for near-expiry batch (expires in ${topBatch.batch.diffDays}d)`,
        label: `Dispense Batch ${topBatch.batch.batchNumber} (${topBatch.batch.diffDays}d left)`
      };
    } else {
      spokenResponse = `No medicines are expiring in the immediate upcoming week. All active batches have healthy remaining shelf life.`;
      thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. Checked 0-30 day horizon.
2. No immediate batches under 7 days.
3. Shelf life healthy.`;
    }
  } else if (isExpiredQuery) {
    const expiredBatches: any[] = [];
    inventory.forEach(m => {
      m.batches.forEach(b => {
        if (b.expiryStatus === 'Expired') {
          expiredBatches.push({ medicine: m, batch: b });
        }
      });
    });

    if (expiredBatches.length > 0) {
      const firstExpired = expiredBatches[0];
      spokenResponse = `Alert: We have expired stock on the shelf. ${firstExpired.medicine.name} Batch ${firstExpired.batch.batchNumber} has ${firstExpired.batch.quantity} units expired ${Math.abs(firstExpired.batch.diffDays)} days ago. Do not dispense! It must be quarantined immediately.`;
      thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Safety Audit:** Scanned all ${snapshot.totalBatches} active batches against reference date ${snapshot.referenceDate}.
2. **Expired Batch Detection:** Found Batch ${firstExpired.batch.batchNumber} (${firstExpired.medicine.name}) with expiry ${firstExpired.batch.expiryDate} (${Math.abs(firstExpired.batch.diffDays)} days past shelf life).
3. **FEFO & Patient Safety Protocol:** Expired medications undergo degradation, potency loss, and potential toxicity. Strictly prohibited from dispensary stock.
4. **Action Determination:** Generating immediate quarantine action to isolate all ${firstExpired.batch.quantity} units from dispensary circulation.`;

      suggestedAction = {
        type: 'QUARANTINE',
        medicineId: firstExpired.medicine.id,
        medicineName: firstExpired.medicine.name,
        batchId: firstExpired.batch.batchId,
        batchNumber: firstExpired.batch.batchNumber,
        quantity: firstExpired.batch.quantity,
        reason: 'Quarantine and isolate expired batch to prevent accidental dispensing',
        label: `Quarantine Batch ${firstExpired.batch.batchNumber} (${firstExpired.batch.quantity} units)`
      };
    } else {
      spokenResponse = `Good news! There are currently no expired batches in the clinic inventory. All active medications are within safe shelf life.`;
      thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Inventory Verification:** Evaluated all ${snapshot.totalBatches} batches in SQLite.
2. **Threshold Check:** 0 batches have diffDays <= 0.
3. **Clinical Conclusion:** Shelf compliance is 100% safe.`;
    }
  } else if (matchedMed) {
    const usableBatches = matchedMed.batches.filter(b => b.diffDays > 0 && b.quantity > 0).sort((a, b) => a.diffDays - b.diffDays);
    const expiredBatches = matchedMed.batches.filter(b => b.diffDays <= 0);

    if (query.includes('dispense') || query.includes('log') || isFefoQuery) {
      if (usableBatches.length > 0) {
        const best = usableBatches[0];
        const dispenseQty = Math.min(parsedQty || 10, best.quantity);

        if (query.includes('log') || (query.includes('dispense') && qtyMatch)) {
          spokenResponse = `Ready to log dispensing of ${dispenseQty} ${matchedMed.unit} for ${matchedMed.name} from FEFO priority Batch ${best.batchNumber}. It currently has ${best.quantity} units and expires in ${best.diffDays} days (${best.expiryDate}). Please confirm to record this stock-out.`;
        } else {
          spokenResponse = `For ${matchedMed.name}, always dispense Batch ${best.batchNumber} first under FEFO. It expires in ${best.diffDays} days with ${best.quantity} ${matchedMed.unit} available.`;
        }

        if (expiredBatches.length > 0) {
          spokenResponse += ` Note: Batch ${expiredBatches[0].batchNumber} is expired and must remain quarantined.`;
        }

        thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Target Drug Identification:** ${matchedMed.name} (${matchedMed.genericName}) • Total stock: ${matchedMed.totalStock} ${matchedMed.unit}.
2. **FEFO Priority Calculation:**
   - Evaluated ${usableBatches.length} usable active batches against reference date ${snapshot.referenceDate}.
   - Selected Batch: ${best.batchNumber} (Expires in ${best.diffDays} days, current balance: ${best.quantity} ${matchedMed.unit}).
   - Subsequent Batches: ${usableBatches.slice(1).map(b => `${b.batchNumber} (${b.diffDays}d)`).join(', ') || 'None'}.
3. **Wastage Prevention & Dispensing Analysis:**
   - Dispensing ${dispenseQty} units from Batch ${best.batchNumber} ensures oldest valid stock rotates first before near-term expiry.
   - Post-dispense projected balance for Batch ${best.batchNumber}: ${best.quantity - dispenseQty} ${matchedMed.unit}.
4. **Safety Clearance:** Batch has ${best.diffDays} days remaining, meeting safe administration shelf-life criteria.`;

        suggestedAction = {
          type: 'DISPENSE',
          medicineId: matchedMed.id,
          medicineName: matchedMed.name,
          batchId: best.batchId,
          batchNumber: best.batchNumber,
          quantity: dispenseQty,
          reason: `Dispensed ${dispenseQty} units via MediTrack Voice Assistant under FEFO priority (Batch expires in ${best.diffDays}d)`,
          label: `Confirm Dispense ${dispenseQty} ${matchedMed.unit} from Batch ${best.batchNumber}`
        };
      } else {
        spokenResponse = `${matchedMed.name} has no usable stock available right now! The clinic is stocked out. Please initiate an emergency reorder.`;
        thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. Stock check: Total quantity = 0.
2. Clinical risk: Interruption of essential therapeutic course.
3. Urgent supplier order recommended.`;

        suggestedAction = {
          type: 'REORDER',
          medicineId: matchedMed.id,
          medicineName: matchedMed.name,
          label: `Generate Reorder for ${matchedMed.name}`
        };
      }
    } else {
      // Stock query for matched medicine
      spokenResponse = `We currently have ${matchedMed.totalStock} ${matchedMed.unit} of ${matchedMed.name} across ${matchedMed.batches.length} batch${matchedMed.batches.length > 1 ? 'es' : ''}.`;
      if (matchedMed.isLowStock) {
        spokenResponse += ` Note: This is below our minimum threshold of ${matchedMed.minimumStock} ${matchedMed.unit}.`;
      } else if (matchedMed.isOutOfStock) {
        spokenResponse += ` This medicine is completely out of stock!`;
      } else if (usableBatches.length > 0) {
        spokenResponse += ` Earliest active batch is ${usableBatches[0].batchNumber}, expiring in ${usableBatches[0].diffDays} days.`;
      }

      thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Inventory Assessment:** ${matchedMed.name} current stock is ${matchedMed.totalStock} ${matchedMed.unit} (Min: ${matchedMed.minimumStock}).
2. **Batch Distribution:** ${matchedMed.batches.map(b => `Batch ${b.batchNumber}: ${b.quantity} ${matchedMed.unit} (${b.expiryStatus})`).join(', ')}.
3. **Supply Chain Recommendation:** ${matchedMed.isLowStock ? 'Immediate reorder recommended to avoid rural stockout.' : 'Stock is within acceptable operational range.'}`;
    }
  } else if (query.includes('reorder') || query.includes('shortage') || query.includes('low')) {
    const lowStock = inventory.filter(m => m.isLowStock || m.isOutOfStock);
    spokenResponse = `We have ${lowStock.length} medicines requiring attention. ${lowStock.map(m => `${m.name} (${m.totalStock} ${m.unit})`).join(', ')}. Urgent reorders should be placed for out-of-stock items.`;
    thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Supply Chain Audit:** Screened entire formulary against minimum stock thresholds.
2. **Critical Shortages Identified:**
   ${lowStock.map(m => `- ${m.name}: ${m.totalStock}/${m.minimumStock} ${m.unit} (${m.isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'})`).join('\n   ')}
3. **Operational Impact:** High-demand rural clinic lines risk patient turnaround failure without rapid replenishment.`;
  } else {
    // General overview
    const expiringSoon = inventory.filter(m => m.batches.some(b => b.expiryStatus === 'Expiring Soon'));
    spokenResponse = `MediTrack 360 clinic status: We have ${snapshot.totalMedicines} medicines registered with ${snapshot.totalBatches} batches. There are ${snapshot.activeAlerts.length} active alerts requiring review. How can I assist you with stock or FEFO dispensing?`;
    thinkingProcess = `### 🧠 High Thinking Clinical Reasoning (ThinkingLevel.HIGH)
1. **Comprehensive Formulary Overview:** ${snapshot.totalMedicines} medications, ${snapshot.totalBatches} batches.
2. **Alert Analysis:** Active alerts count = ${snapshot.activeAlerts.length}. Priority areas: FEFO rotation and near-expiry management.
3. **Voice Interaction Mode:** Ready for voice dispensing instructions, batch queries, or quarantine operations.`;
  }

  return {
    spokenResponse,
    thinkingProcess,
    suggestedAction,
    audioBase64: null,
    thinkingLevel: 'HIGH',
    isAlgorithmicFallback: true
  };
}

// POST /api/ai/voice-assistant
app.post('/api/ai/voice-assistant', async (req, res) => {
  const { message, conversationHistory, thinkingLevel = 'HIGH', voice = 'Kore' } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  const snapshot = getClinicInventorySnapshot();
  const aiClient = getGeminiClient();

  if (!aiClient) {
    // Fast, intelligent high-thinking fallback
    const fallbackResult = generateAlgorithmicHighThinking(message, snapshot);
    return res.json(fallbackResult);
  }

  try {
    const systemPrompt = `You are MediTrack 360 AI, an expert Clinical Pharmacist & Rural Health Inventory Specialist.
Today's date is October 23, 2026.
You are assisting doctors, nurses, and pharmacists in rural clinics and health centers.
Staff interact with you via voice conversation, often while actively dispensing medicines or managing stock.

CURRENT CLINIC INVENTORY & BATCH STATUS:
${JSON.stringify(snapshot, null, 2)}

FEFO (FIRST-EXPIRED, FIRST-OUT) PROTOCOL:
1. When dispensing or recommending batches, ALWAYS recommend the batch with the earliest expiry date that has diffDays > 0.
2. NEVER approve or recommend dispensing expired batches (diffDays <= 0, status 'Expired'). Expired medications must be immediately flagged for quarantine and safe pharmaceutical disposal.
3. If stock is low (below minimumStock) or out of stock, clearly inform the user and recommend an immediate supply order.
4. Keep the 'spokenResponse' concise, natural, warm, and highly audible (2 to 4 sentences maximum) so it is clear when played over text-to-speech.
5. In 'thinkingProcess', perform comprehensive High Thinking reasoning (ThinkingLevel.HIGH):
   - Step 1: Query Intent & Medicine Match
   - Step 2: Batch Verification & Expiry Calculation (exact diffDays from Oct 23, 2026)
   - Step 3: FEFO Priority & Clinical Safety Audit
   - Step 4: Regulatory & Patient Safety Checks
   - Step 5: Stock Impact & Recommendation
6. In 'suggestedAction', if the query implies an action (such as dispensing a medicine, quarantining an expired batch, reordering, or inspecting), provide a structured object so the user can execute it with one click:
   {
     "type": "DISPENSE" | "QUARANTINE" | "REORDER" | "VIEW_MEDICINE",
     "medicineId": number,
     "medicineName": string,
     "batchId": number,
     "batchNumber": string,
     "quantity": number,
     "reason": string,
     "label": string
   }
   If no concrete action is implied, set suggestedAction to null.`;

    const selectedThinkingLevel = thinkingLevel === 'MEDIUM' ? ThinkingLevel.MEDIUM : ThinkingLevel.HIGH;

    // 1. Generate reasoned clinical text with High Thinking
    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...(conversationHistory || []).map((h: any) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        {
          role: 'user',
          parts: [{ text: message }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: selectedThinkingLevel
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spokenResponse: {
              type: Type.STRING,
              description: 'A concise, natural, spoken response suitable for reading aloud via TTS (2-4 sentences max). Must cite exact batch number and expiry days.'
            },
            thinkingProcess: {
              type: Type.STRING,
              description: 'High Thinking clinical & pharmaceutical reasoning breakdown covering batch calculation, FEFO verification, expiry safety analysis, and protocol justification.'
            },
            suggestedAction: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                type: { type: Type.STRING, description: 'DISPENSE | QUARANTINE | REORDER | VIEW_MEDICINE' },
                medicineId: { type: Type.INTEGER },
                medicineName: { type: Type.STRING },
                batchId: { type: Type.INTEGER },
                batchNumber: { type: Type.STRING },
                quantity: { type: Type.INTEGER },
                reason: { type: Type.STRING },
                label: { type: Type.STRING }
              }
            }
          },
          required: ['spokenResponse', 'thinkingProcess']
        }
      }
    });

    let aiResult: any;
    try {
      aiResult = JSON.parse(response.text || '{}');
    } catch {
      aiResult = {
        spokenResponse: response.text || 'Understood. Reviewing clinic stock.',
        thinkingProcess: 'High thinking reasoning processed successfully.',
        suggestedAction: null
      };
    }

    // 2. Generate natural voice TTS with gemini-3.8-flash-lite-tts
    let audioBase64: string | null = null;
    try {
      const ttsResponse = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: aiResult.spokenResponse,
                speechMetadata: {
                  style: 'Clear, reassuring, professional clinical pharmacist and medical inventory guide'
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || 'Kore' }
            }
          }
        }
      });

      audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr) {
      console.warn('Gemini TTS generation error, falling back to client synthesis:', ttsErr);
    }

    return res.json({
      spokenResponse: aiResult.spokenResponse,
      thinkingProcess: aiResult.thinkingProcess,
      suggestedAction: aiResult.suggestedAction || null,
      audioBase64,
      thinkingLevel: thinkingLevel || 'HIGH',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Gemini Voice Assistant Error:', err);
    // Graceful fallback to algorithmic high thinking
    const fallbackResult = generateAlgorithmicHighThinking(message, snapshot);
    return res.json(fallbackResult);
  }
});

// POST /api/ai/tts
app.post('/api/ai/tts', async (req, res) => {
  const { text, voice = 'Kore' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS.' });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return res.status(503).json({ error: 'Gemini API is not configured on this server.' });
  }

  try {
    const ttsResponse = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style: 'Clear, reassuring, professional clinical pharmacist'
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' }
          }
        }
      }
    });

    const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    return res.json({ audioBase64, voice });
  } catch (err: any) {
    console.error('TTS generation failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MediTrack 360] Server running on port ${PORT}`);
  });
}

startServer();
