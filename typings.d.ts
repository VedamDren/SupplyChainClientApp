import 'umi/typings';
declare namespace API {
  interface ListResponse<T> {
    data: T[];
    total?: number;
    success?: boolean;
  }
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