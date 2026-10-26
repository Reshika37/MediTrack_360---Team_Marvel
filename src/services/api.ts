import { Medicine, DashboardData, StockMovement, AlertItem } from '../types/index.ts';

const CACHE_KEYS = {
  DASHBOARD: 'meditrack_cache_dashboard',
  MEDICINES: 'meditrack_cache_medicines',
  ALERTS: 'meditrack_cache_alerts',
  HISTORY: 'meditrack_cache_history',
  PENDING_SYNC: 'meditrack_pending_sync_queue'
};

export interface PendingAction {
  id: string;
  type: 'STOCK_UPDATE' | 'ADD_MEDICINE';
  payload: any;
  timestamp: string;
}

export const api = {
  getPendingActions(): PendingAction[] {
    try {
      const data = localStorage.getItem(CACHE_KEYS.PENDING_SYNC);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addPendingAction(type: PendingAction['type'], payload: any) {
    const queue = this.getPendingActions();
    const action: PendingAction = {
      id: 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    queue.push(action);
    localStorage.setItem(CACHE_KEYS.PENDING_SYNC, JSON.stringify(queue));
    return action;
  },

  clearPendingActions() {
    localStorage.setItem(CACHE_KEYS.PENDING_SYNC, JSON.stringify([]));
  },

  async syncPendingActions(): Promise<{ synced: number; errors: number }> {
    const queue = this.getPendingActions();
    if (queue.length === 0) return { synced: 0, errors: 0 };

    let synced = 0;
    let errors = 0;
    const remaining: PendingAction[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'STOCK_UPDATE') {
          await fetch('/api/stock/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          synced++;
        } else if (item.type === 'ADD_MEDICINE') {
          await fetch('/api/medicines', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          synced++;
        }
      } catch (e) {
        console.error('Failed to sync item:', item, e);
        errors++;
        remaining.push(item);
      }
    }

    localStorage.setItem(CACHE_KEYS.PENDING_SYNC, JSON.stringify(remaining));
    return { synced, errors };
  },

  async getDashboard(isOffline = false): Promise<DashboardData> {
    if (isOffline) {
      const cached = localStorage.getItem(CACHE_KEYS.DASHBOARD);
      if (cached) return JSON.parse(cached);
    }

    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.DASHBOARD, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.DASHBOARD);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async getMedicines(isOffline = false): Promise<Medicine[]> {
    if (isOffline) {
      const cached = localStorage.getItem(CACHE_KEYS.MEDICINES);
      if (cached) return JSON.parse(cached);
    }

    try {
      const res = await fetch('/api/medicines');
      if (!res.ok) throw new Error('Failed to fetch medicines');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.MEDICINES, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.MEDICINES);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async addMedicine(payload: any, isOffline = false) {
    if (isOffline) {
      this.addPendingAction('ADD_MEDICINE', payload);
      // Optimistically update cached medicines
      const cached = await this.getMedicines(true);
      const tempMed: Medicine = {
        id: Date.now(),
        name: payload.name,
        generic_name: payload.generic_name,
        category: payload.category || 'General',
        manufacturer: payload.manufacturer || 'Pharma',
        supplier: payload.supplier || 'Local Depot',
        unit: payload.unit || 'Tablets',
        minimum_stock: Number(payload.minimum_stock) || 10,
        notes: payload.notes || '',
        totalStock: Number(payload.quantity),
        stockStatus: Number(payload.quantity) <= Number(payload.minimum_stock) ? 'Low Stock' : 'Healthy',
        earliestExpiryDays: 300,
        worstExpiryStatus: 'Healthy',
        batches: [
          {
            id: Date.now() + 1,
            medicine_id: Date.now(),
            batch_number: payload.batch_number,
            expiry_date: payload.expiry_date,
            quantity: Number(payload.quantity),
            purchase_date: payload.purchase_date || '2026-10-23',
            diffDays: 300,
            expiryStatus: 'Healthy'
          }
        ]
      };
      cached.push(tempMed);
      localStorage.setItem(CACHE_KEYS.MEDICINES, JSON.stringify(cached));
      return { success: true, offline: true };
    }

    const res = await fetch('/api/medicines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add medicine');
    }
    return res.json();
  },

  async updateStock(payload: {
    batch_id: number;
    movement_type: 'Stock In' | 'Stock Out' | 'Adjustment';
    quantity: number;
    reason: string;
    staff_name: string;
    user_id?: number;
  }, isOffline = false) {
    if (isOffline) {
      this.addPendingAction('STOCK_UPDATE', payload);

      // Optimistically update cached medicines
      const cached = await this.getMedicines(true);
      for (const med of cached) {
        if (med.batches) {
          const b = med.batches.find(batch => batch.id === payload.batch_id);
          if (b) {
            const prev = b.quantity;
            let next = prev;
            if (payload.movement_type === 'Stock In') next = prev + payload.quantity;
            else if (payload.movement_type === 'Stock Out') next = Math.max(0, prev - payload.quantity);
            else if (payload.movement_type === 'Adjustment') next = payload.quantity;
            b.quantity = next;
            med.totalStock = med.batches.reduce((sum, item) => sum + item.quantity, 0);
            if (med.totalStock === 0) med.stockStatus = 'Out of Stock';
            else if (med.totalStock <= med.minimum_stock) med.stockStatus = 'Low Stock';
            else med.stockStatus = 'Healthy';
            break;
          }
        }
      }
      localStorage.setItem(CACHE_KEYS.MEDICINES, JSON.stringify(cached));
      return { success: true, offline: true };
    }

    const res = await fetch('/api/stock/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update stock');
    }
    return res.json();
  },

  async getStockHistory(isOffline = false): Promise<StockMovement[]> {
    if (isOffline) {
      const cached = localStorage.getItem(CACHE_KEYS.HISTORY);
      if (cached) return JSON.parse(cached);
    }

    try {
      const res = await fetch('/api/stock/history');
      if (!res.ok) throw new Error('Failed to fetch stock history');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.HISTORY);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async getAlerts(isOffline = false): Promise<AlertItem[]> {
    if (isOffline) {
      const cached = localStorage.getItem(CACHE_KEYS.ALERTS);
      if (cached) return JSON.parse(cached);
    }

    try {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      localStorage.setItem(CACHE_KEYS.ALERTS, JSON.stringify(data));
      return data;
    } catch (err) {
      const cached = localStorage.getItem(CACHE_KEYS.ALERTS);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  async markAlertStatus(id: number, status: 'resolved' | 'dismissed') {
    const res = await fetch(`/api/alerts/${id}/read`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  async deleteMedicine(id: number) {
    const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async addBatch(medicineId: number, payload: any) {
    const res = await fetch(`/api/medicines/${medicineId}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add batch');
    }
    return res.json();
  },

  async updateMedicine(id: number, payload: any) {
    const res = await fetch(`/api/medicines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getReports(type: 'stock' | 'expiry') {
    const res = await fetch(`/api/reports/${type}`);
    return res.json();
  },

  async resetDemoData() {
    const res = await fetch('/api/seed/reset', { method: 'POST' });
    return res.json();
  },

  async sendVoiceMessage(payload: {
    message: string;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    thinkingLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
    voice?: string;
  }) {
    const res = await fetch('/api/ai/voice-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Voice assistant request failed: ${res.statusText}`);
    }
    return res.json();
  },

  async generateTTS(payload: { text: string; voice?: string }) {
    const res = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`TTS request failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getRestockAnalysis(
    payload: { leadTimeDays?: number; supplierName?: string; season?: string; refreshAI?: boolean },
    signal?: AbortSignal
  ) {
    const res = await fetch('/api/ai/restock-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Restock analysis failed: ${res.statusText}`);
    }
    return res.json();
  },

  async dispatchPurchaseIndent(payload: {
    requisitionId: string;
    supplierName: string;
    leadTimeDays: number;
    season: string;
    items: any[];
    staffName?: string;
    executiveSummary?: string;
    autoReceive?: boolean;
  }) {
    const res = await fetch('/api/restock/dispatch-indent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Dispatch purchase indent failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getPurchaseIndents() {
    const res = await fetch('/api/restock/indents');
    if (!res.ok) {
      throw new Error(`Failed to load indents: ${res.statusText}`);
    }
    return res.json();
  }
};
