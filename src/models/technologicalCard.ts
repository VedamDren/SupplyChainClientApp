import { MaterialDto } from "./material";
import { SubdivisionDto } from "./subdivision";

export interface TechnologicalCardDto {
  id: number;
  subdivisionId: number;
  finishedProductId: number;
  rawMaterialId: number;
  rawMaterialPerUnit: number;
  subdivision?: SubdivisionDto;
  finishedProduct?: MaterialDto;
  rawMaterial?: MaterialDto;
}

export interface TechnologicalCardCreateDto {
  subdivisionId: number;
  finishedProductId: number;
  rawMaterialId: number;
  rawMaterialPerUnit: number;
}

export interface TechnologicalCardUpdateDto {
  subdivisionId?: number;
  finishedProductId?: number;
  rawMaterialId?: number;
  rawMaterialPerUnit?: number;
}