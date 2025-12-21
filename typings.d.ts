import 'umi/typings';

// Декларации для Dva/UMI
declare module 'umi' {
  export interface EffectsCommandMap {
    put: <A = any>(action: A) => any;
    call: <T = any>(fn: any, ...args: any[]) => Promise<T>;
    select: <T = any>(selector: any, ...args: any[]) => T;
    take: (type: any) => any;
    cancel: (task: any) => any;
    [key: string]: any;
  }
  
  export interface Action {
    type: string;
    payload?: any;
    [key: string]: any;
  }
  
  export type Effect = (action: Action, effects: EffectsCommandMap) => any;
  export type Reducer<S = any> = (state: S, action: Action) => S;
}

// Глобальное пространство имен для API
declare namespace API {
  interface ListResponse<T> {
    data: T[];
    total?: number;
    success?: boolean;
  }

  interface Response<T> {
    success: boolean;
    data: T;
    message?: string;
    code?: number;
  }
}

// Глобальные типы
declare type ProductionPlanCalculationRequest = {
  subdivisionId: number;
  materialId: number;
  date: string;
}

declare type ProductionPlanCalculationResult = {
  date: string;
  productionPlan: number;
  currentInventory: number;
  previousInventory: number;
  transferQuantity: number;
}

declare type ProductionPlanDetailedResult = {
  date: string;
  productionPlan: number;
  currentMonthInventory: number;
  nextMonthInventory: number;
  transferQuantity: number;
  calculationFormula: string;
  isFixedValue: boolean;
  note: string;
}

declare type FeasibilityCheckResult = {
  hasCurrentMonthInventory: boolean;
  hasNextMonthInventory: boolean;
  hasTransfers: boolean;
  canCalculate: boolean;
  isValid: boolean;
  validationError?: string;
  warning?: string;
}

declare type Subdivision = {
  id: number;
  name: string;
  type: string;
}

declare type Material = {
  id: number;
  name: string;
  type: string;
}

declare type SupplySource = {
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

// Декларации для файлов
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