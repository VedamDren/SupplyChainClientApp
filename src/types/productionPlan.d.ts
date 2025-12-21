// src/types/productionPlan.d.ts
export interface ProductionPlanCalculationRequest {
  subdivisionId: number;
  materialId: number;
  date: string;
}

export interface ProductionPlanCalculationResult {
  date: string;
  productionPlan: number;
  currentInventory: number;
  previousInventory: number;
  transferQuantity: number;
}

export interface ProductionPlanDetailedResult {
  date: string;
  productionPlan: number;
  currentMonthInventory: number;
  nextMonthInventory: number;
  transferQuantity: number;
  calculationFormula: string;
  isFixedValue: boolean;
  note: string;
}

export interface FeasibilityCheckResult {
  hasCurrentMonthInventory: boolean;
  hasNextMonthInventory: boolean;
  hasTransfers: boolean;
  canCalculate: boolean;
  isValid: boolean;
  validationError?: string;
  warning?: string;
}

export interface Subdivision {
  id: number;
  name: string;
  type: string;
}

export interface Material {
  id: number;
  name: string;
  type: string;
}

export interface SupplySource {
  id: number;
  sourceSubdivisionId: number;
  destinationSubdivisionId: number;
  materialId: number;
  startDate: string;
  endDate: string;
  sourceSubdivision?: Subdivision;
  destinationSubdivision?: Subdivision;
  material?: Material;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  code?: number;
}