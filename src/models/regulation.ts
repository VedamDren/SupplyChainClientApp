import { MaterialDto } from "./material";
import { SubdivisionDto } from "./subdivision";

export interface RegulationDto {
  id: number;
  subdivisionId: number;
  materialId: number;
  date: string;
  daysCount: number;
  subdivision?: SubdivisionDto;
  material?: MaterialDto;
}

export interface RegulationCreateDto {
  subdivisionId: number;
  materialId: number;
  date: string;
  daysCount: number;
}

export interface RegulationUpdateDto {
  subdivisionId?: number;
  materialId?: number;
  date?: string;
  daysCount?: number;
}