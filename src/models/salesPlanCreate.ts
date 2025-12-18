import { UpdateSalesPlanRequest } from "./salesPlan";

export interface CreateSalesPlanDto {
  year: number;
  subdivisionId: number;
  materialId: number;
  salesPlan: MonthlySalesPlanDto[];
}

export interface MonthlySalesPlanDto {
  month: number; // 1-12
  plannedSales: number;
}

export interface BulkSalesPlanUpdateDto {
  updates: UpdateSalesPlanRequest[];
}

// Для импорта из Excel/CSV
export interface SalesPlanImportDto {
  year: number;
  month: number;
  subdivisionCode: string;
  materialCode: string;
  salesValue: number;
}