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

export interface ProductionPlanResponseDto {
  [x: string]: any;
  id: number;
  subdivisionId: number;
  subdivisionName: string;
  materialId: number;
  materialName: string;
  date: string;
  quantity: number;
}

export interface SaveProductionPlanRequestDto {
  subdivisionId: number;
  materialId: number;
  calculatedPlans: ProductionPlanCalculationResult[];
  overwriteExisting?: boolean;
  comment?: string;
}

export interface PlanComparisonRequestDto {
  subdivisionId: number;
  materialId: number;
  calculatedPlans: ProductionPlanCalculationResult[];
}

export interface PlanComparisonResultDto {
  subdivisionId: number;
  materialId: number;
  year: number;
  totalCalculatedPlans: number;
  totalSavedPlans: number;
  matchingPlans: number;
  differentPlans: number;
  missingPlans: number;
  details: PlanComparisonDetailDto[];
}

export interface PlanComparisonDetailDto {
  date: string;
  calculatedQuantity: number;
  savedQuantity: number;
  hasSavedPlan: boolean;
  difference: number;
  status: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Дополнительные интерфейсы, используемые в компоненте
export interface ProductionPlanResult {
  date: string;
  productionPlan: number;
  currentInventory: number;
  previousInventory: number;
  transferQuantity: number;
}

export interface PlanComparisonModalData {
  visible: boolean;
  data: PlanComparisonResultDto | null;
  loading: boolean;
}