export interface MedicineBatch {
  id: number;
  medicine_id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_date: string;
  diffDays?: number;
  expiryStatus?: 'Expired' | 'Expiring Soon' | 'Warning' | 'Healthy';
}

export interface Medicine {
  id: number;
  name: string;
  generic_name: string;
  category: string;
  manufacturer: string;
  supplier: string;
  unit: string;
  minimum_stock: number;
  notes?: string;
  totalStock?: number;
  stockStatus?: 'Out of Stock' | 'Low Stock' | 'Healthy';
  earliestExpiryDays?: number | null;
  worstExpiryStatus?: 'Expired' | 'Expiring Soon' | 'Warning' | 'Healthy';
  fefoBatch?: string;
  batches?: MedicineBatch[];
}

export interface StockMovement {
  id: number;
  batch_id: number;
  medicine_name: string;
  batch_number: string;
  movement_type: 'Stock In' | 'Stock Out' | 'Adjustment';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  user_id: number;
  staff_name: string;
  timestamp: string;
}

export interface AlertItem {
  id: number;
  batch_id: number | null;
  medicine_name: string;
  alert_type: 'expired' | 'expiring_soon' | 'warning' | 'low_stock' | 'out_of_stock';
  message: string;
  status: 'active' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface DashboardData {
  summary: {
    totalMedicines: number;
    totalBatches: number;
    expiringSoonCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    healthyStockCount: number;
    warningCount: number;
  };
  expiryDistribution: {
    expired: number;
    range0_30: number;
    range31_50: number;
    range50plus: number;
  };
  fefoRecommendations: Array<{
    medicineId: number;
    medicineName: string;
    recommendedBatch: string;
    recommendedDays: number;
    recommendedQty: number;
    expiryDate: string;
    otherBatchesCount: number;
    advice: string;
  }>;
  recentActivity: StockMovement[];
  alerts: AlertItem[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface VoiceAction {
  type: 'DISPENSE' | 'QUARANTINE' | 'REORDER' | 'VIEW_MEDICINE';
  medicineId?: number;
  medicineName?: string;
  batchId?: number;
  batchNumber?: string;
  quantity?: number;
  reason?: string;
  label: string;
}

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  spokenResponse?: string;
  thinkingProcess?: string;
  thinkingLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  audioBase64?: string;
  suggestedAction?: VoiceAction | null;
  actionExecuted?: boolean;
  timestamp: string;
}

export interface RestockItem {
  medicineId: number;
  name: string;
  genericName: string;
  category: string;
  unit: string;
  currentUsableStock: number;
  expiredStock: number;
  minimumStock: number;
  dailyVelocity: number;
  seasonalMultiplier: number;
  effectiveVelocity: number;
  leadTimeDays: number;
  leadTimeDemand: number; // velocity * leadTime
  reorderPoint: number; // leadTimeDemand + minimumStock
  daysOfSupply: number; // currentUsableStock / effectiveVelocity
  urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'SURPLUS';
  suggestedReorderQty: number;
  orderQty: number;
  packSize: number;
  unitCostEst: number;
  totalCostEst: number;
  selected: boolean;
  clinicalRationale: string;
}

export interface RestockPlanResponse {
  leadTimeDays: number;
  supplierName: string;
  season: string;
  executiveSummary: string;
  totalRequisitionCost: number;
  criticalItemsCount: number;
  warningItemsCount: number;
  healthyItemsCount: number;
  items: RestockItem[];
  requisitionId: string;
  procurementDirectives: string[];
  isAlgorithmicFallback?: boolean;
}
