"""
MediTrack 360 - Flask Backend API Reference Implementation
Architecture: React Frontend + Python/Flask Backend + SQLite Database

This file provides the direct Python/Flask backend implementation
matching the architecture proposed in the MediTrack 360 specification.
"""

import sqlite3
import datetime
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'meditrack.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "service": "MediTrack 360 Flask API", "time": datetime.datetime.now().isoformat()})

@app.route('/api/medicines', methods=['GET'])
def get_medicines():
    conn = get_db()
    medicines = conn.execute("SELECT * FROM medicines ORDER BY name ASC").fetchall()
    batches = conn.execute("SELECT * FROM medicine_batches ORDER BY expiry_date ASC").fetchall()
    conn.close()

    result = []
    today = datetime.date(2026, 10, 23)

    for m in medicines:
        med_dict = dict(m)
        med_batches = [dict(b) for b in batches if b['medicine_id'] == m['id']]
        total_stock = sum(b['quantity'] for b in med_batches)

        # Batch days remaining
        for b in med_batches:
            exp_date = datetime.date.fromisoformat(b['expiry_date'])
            diff = (exp_date - today).days
            b['diffDays'] = diff
            if diff <= 0:
                b['expiryStatus'] = 'Expired'
            elif diff <= 30:
                b['expiryStatus'] = 'Expiring Soon'
            elif diff <= 50:
                b['expiryStatus'] = 'Warning'
            else:
                b['expiryStatus'] = 'Healthy'

        stock_status = 'Healthy'
        if total_stock == 0:
            stock_status = 'Out of Stock'
        elif total_stock <= m['minimum_stock']:
            stock_status = 'Low Stock'

        usable = [b for b in med_batches if b['diffDays'] > 0 and b['quantity'] > 0]
        usable.sort(key=lambda x: x['diffDays'])
        fefo_batch = usable[0]['batch_number'] if usable else (med_batches[0]['batch_number'] if med_batches else 'None')

        med_dict['totalStock'] = total_stock
        med_dict['stockStatus'] = stock_status
        med_dict['fefoBatch'] = fefo_batch
        med_dict['batches'] = med_batches
        result.append(med_dict)

    return jsonify(result)

@app.route('/api/stock/update', methods=['POST'])
def update_stock():
    data = request.json or {}
    batch_id = data.get('batch_id')
    movement_type = data.get('movement_type')
    quantity = int(data.get('quantity', 0))
    reason = data.get('reason', '')
    staff_name = data.get('staff_name', 'Rural Clinic Pharmacist')

    conn = get_db()
    batch = conn.execute("SELECT b.*, m.name as medicine_name FROM medicine_batches b JOIN medicines m ON b.medicine_id = m.id WHERE b.id = ?", (batch_id,)).fetchone()
    if not batch:
        conn.close()
        return jsonify({"error": "Batch not found"}), 404

    prev_qty = batch['quantity']
    if movement_type == 'Stock In':
        new_qty = prev_qty + quantity
    elif movement_type == 'Stock Out':
        if quantity > prev_qty:
            conn.close()
            return jsonify({"error": "Quantity exceeds available batch stock"}), 400
        new_qty = prev_qty - quantity
    elif movement_type == 'Adjustment':
        new_qty = quantity
    else:
        conn.close()
        return jsonify({"error": "Invalid movement type"}), 400

    conn.execute("UPDATE medicine_batches SET quantity = ? WHERE id = ?", (new_qty, batch_id))
    conn.execute(
        """INSERT INTO stock_movements (batch_id, medicine_name, batch_number, movement_type, quantity, previous_quantity, new_quantity, reason, user_id, staff_name, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)""",
        (batch_id, batch['medicine_name'], batch['batch_number'], movement_type, quantity, prev_qty, new_qty, reason, staff_name, datetime.datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "previous_quantity": prev_qty, "new_quantity": new_qty})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
