import 'umi/typings';
declare namespace API {
  interface ListResponse<T> {
    data: T[];
    total?: number;
    success?: boolean;
  }
}
declare module '*.css';
declare module '*.less';
declare module '*.png';
declare module '*.svg' {
  export function ReactComponent(
    props: React.SVGProps<SVGSVGElement>,
  ): React.ReactElement;
  const url: string;
  export default url;
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