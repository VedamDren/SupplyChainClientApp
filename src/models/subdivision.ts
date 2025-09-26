export interface SubdivisionDto {
  id: number;
  name: string;
  type: SubdivisionType;
}

export interface SubdivisionCreateDto {
  name: string;
  type: SubdivisionType;
}

export interface SubdivisionUpdateDto {
  name?: string;
  type?: SubdivisionType;
}

export enum SubdivisionType {
  Trading = "Trading",
  Production = "Production"
}

export const SubdivisionTypeLabels = {
  [SubdivisionType.Trading]: 'Торговое',
  [SubdivisionType.Production]: 'Производственное'
};