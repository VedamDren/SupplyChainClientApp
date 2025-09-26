import { MaterialDto } from "./material";
import { SubdivisionDto } from "./subdivision";

export interface SupplySourceDto {
  id: number;
  sourceSubdivisionId: number;
  destinationSubdivisionId: number;
  materialId: number;
  startDate: string;
  endDate: string;
  sourceSubdivision?: SubdivisionDto;
  destinationSubdivision?: SubdivisionDto;
  material?: MaterialDto;
}

export interface SupplySourceMatrixItem {
  destinationSubdivisionId: number;
  destinationSubdivisionName: string;
  materialId: number;
  materialName: string;
  monthlySources: { [key: string]: string };
}

export interface MonthlySupplySourceUpdateDto {
  destinationSubdivisionId: number;
  materialId: number;
  year: number;
  month: number;
  sourceSubdivisionId?: number;
}