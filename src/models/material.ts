export interface MaterialDto {
  id: number;
  name: string;
  type: MaterialType;
}

export interface MaterialCreateDto {
  name: string;
  type: MaterialType;
}

export interface MaterialUpdateDto {
  name?: string;
  type?: MaterialType;
}

export enum MaterialType {
  FinishedProduct = "FinishedProduct",
  RawMaterial = "RawMaterial"
}

export const MaterialTypeLabels = {
  [MaterialType.FinishedProduct]: 'Готовая продукция',
  [MaterialType.RawMaterial]: 'Сырье'
};