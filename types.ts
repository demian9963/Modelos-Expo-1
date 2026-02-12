export type OptimizationType = 'MAX' | 'MIN';

export type Relation = '<=' | '>=' | '=';

export type Constraint = {
  id: string;
  coefficients: number[];
  relation: Relation;
  rhs: number;
};

export type SolverMethod = 'SIMPLEX' | 'BIG_M' | 'TWO_PHASE';

export interface Variable {
  name: string;
  type: 'decision' | 'slack' | 'surplus' | 'artificial';
  value?: number;
}

export interface TableauRow {
  basicVar: string;
  coefficients: number[]; // Includes Z column, decision vars, slack/surplus/artificial
  rhs: number;
}

export interface TableauStep {
  stepIndex: number;
  description: string;
  tableau: TableauRow[];
  headers: string[]; // Column headers (Z, x1, x2, s1...)
  basicVars: string[]; // Variables in the basis for each row
  pivotRow?: number;
  pivotCol?: number;
  enteringVar?: string;
  leavingVar?: string;
  isPhase1?: boolean;
  phase?: number;
}

export interface SolveResult {
  steps: TableauStep[];
  finalValues: Record<string, number>;
  zValue: number;
  status: 'OPTIMAL' | 'UNBOUNDED' | 'INFEASIBLE' | 'ERROR';
  errorMessage?: string;
}
