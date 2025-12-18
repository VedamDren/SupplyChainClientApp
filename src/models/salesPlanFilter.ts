import { SalesPlanItem } from "./salesPlan";

export interface SalesPlanFilter {
  year?: number;
  subdivisionIds?: number[];
  materialIds?: number[];
  month?: number;
}

export interface SalesPlanSearchRequest {
  filter: SalesPlanFilter;
  page?: number;
  pageSize?: number;
}

export interface SalesPlanSearchResponse {
  data: SalesPlanItem[];
  total: number;
  months: string[];
}