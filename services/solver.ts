import { Constraint, OptimizationType, SolveResult, SolverMethod, TableauRow, TableauStep } from '../types';

// A large number to represent M. 
// In a purely numerical solver without symbolic algebra, we use a sufficiently large number.
const M_VAL = 100000;

interface InternalTableau {
  rows: number[][]; // Row 0 is objective function
  headers: string[];
  basicVarIndices: number[]; // Index of variable in headers for each row (excluding obj row)
  numVars: number;
  numConstraints: number;
}

const cloneMatrix = (matrix: number[][]) => matrix.map(row => [...row]);

export const solveLinearProgram = (
  method: SolverMethod,
  type: OptimizationType,
  objCoeffs: number[],
  constraints: Constraint[]
): SolveResult => {

  try {
    // 1. Normalize Problem
    // Convert MIN Z to MAX -Z for standard solving, then flip result back.
    const isMin = type === 'MIN';
    const numDecisionVars = objCoeffs.length;
    
    // Setup variables for columns
    let headers = ['Z'];
    for (let i = 1; i <= numDecisionVars; i++) headers.push(`x${i}`);

    // Identify requirements for Slacks, Surplus, Artificials
    const slackVars: string[] = [];
    const surplusVars: string[] = [];
    const artificialVars: string[] = [];

    // We need to track which constraint generated which variable to set initial basis
    const initialBasis: number[] = []; // Indices in the full header list

    // Pre-scan constraints to build headers
    constraints.forEach((c, i) => {
      if (c.relation === '<=') {
        slackVars.push(`s${i + 1}`);
      } else if (c.relation === '>=') {
        surplusVars.push(`e${i + 1}`);
        artificialVars.push(`a${i + 1}`);
      } else if (c.relation === '=') {
        artificialVars.push(`a${i + 1}`);
      }
    });

    // Combine headers
    headers = [...headers, ...slackVars, ...surplusVars, ...artificialVars, 'LD'];
    
    // Map variable names to column indices
    const colCount = headers.length;
    const Z_COL = 0;
    const RHS_COL = colCount - 1;

    // Initialize Matrix
    // Row 0 is Z. Rows 1..m are constraints.
    const numRows = constraints.length + 1;
    let matrix: number[][] = Array(numRows).fill(0).map(() => Array(colCount).fill(0));

    // Fill Constraints
    let currentSlackIdx = 1 + numDecisionVars;
    let currentSurplusIdx = currentSlackIdx + slackVars.length;
    let currentArtificialIdx = currentSurplusIdx + surplusVars.length;

    constraints.forEach((c, rowIdx) => {
      const matrixRow = rowIdx + 1;
      
      // Decision variables
      c.coefficients.forEach((coef, colIdx) => {
        matrix[matrixRow][colIdx + 1] = coef;
      });

      // RHS
      matrix[matrixRow][RHS_COL] = c.rhs;

      // Slack/Surplus/Artificial logic
      if (c.relation === '<=') {
        matrix[matrixRow][currentSlackIdx] = 1;
        initialBasis[rowIdx] = currentSlackIdx;
        currentSlackIdx++;
      } else if (c.relation === '>=') {
        matrix[matrixRow][currentSurplusIdx] = -1;
        matrix[matrixRow][currentArtificialIdx] = 1;
        initialBasis[rowIdx] = currentArtificialIdx;
        currentSurplusIdx++;
        currentArtificialIdx++;
      } else if (c.relation === '=') {
        matrix[matrixRow][currentArtificialIdx] = 1;
        initialBasis[rowIdx] = currentArtificialIdx;
        currentArtificialIdx++;
      }
    });

    // Setup Objective Function (Row 0)
    matrix[0][Z_COL] = 1;
    
    // Standard Simplex: Z - c1x1 - ... = 0
    // If MAX Z: coefficients are negative in tableau.
    // If MIN Z: we solve for MAX (-Z), so original coeffs are reversed.
    // BUT we simplify: Always solve MAX Z'. 
    // If User Max: Z' = Z. Row 0: Z - CjXj = 0 -> Coeffs are -Cj.
    // If User Min: Z' = -Z. Row 0: (-Z) - (-Cj)Xj = 0 -> (-Z) + CjXj = 0. 
    // Wait, easier logic:
    // Standard form: Max Z. Row 0 stores (Cj - Zj). Optimality reached when all row 0 (non-basic) <= 0.
    // Let's stick to: Row 0 contains coefficients of equation: Z + (-c1)x1 + ... = 0
    
    objCoeffs.forEach((coef, idx) => {
      // If Max: Z - (coef)x = 0 -> put -coef
      // If Min: Min Z equiv Max (-Z). Let Z' = -Z. Z = -Z'. -Z' = coef*x -> Z' + coef*x = 0. put coef.
      matrix[0][idx + 1] = isMin ? coef : -coef;
    });

    // METHOD SPECIFIC ADJUSTMENTS
    const steps: TableauStep[] = [];
    const isBigM = method === 'BIG_M';
    const isTwoPhase = method === 'TWO_PHASE';

    // --- TWO PHASE HANDLING ---
    let phase = 1;
    if (isTwoPhase && artificialVars.length > 0) {
      // PHASE 1: Maximize Z* = -Sum(Artificials)  => Max Z* + Sum(A) = 0
      // Temporarily replace Row 0.
      // We need to store original Row 0 to restore it later.
      const originalObjRow = [...matrix[0]];
      
      // Reset Row 0 for Phase 1
      matrix[0] = Array(colCount).fill(0);
      matrix[0][Z_COL] = 1; // This is W (or Z*), phase 1 objective

      // Obj: Minimize Sum(Ai) -> Maximize -Sum(Ai) -> Z* = -A1 - A2... -> Z* + A1 + A2 = 0
      // Initial Row 0 should have +1 for all Artificial columns.
      // BUT, artificials are basic variables. We must eliminate them from Row 0 by row operations.
      // Effectively: NewRow0 = Sum(Constraint Rows where Artificial exists)
      // Actually, formally: Z* + A1 + ... = 0. 
      // In the table, we put 0 for non-artificials, and 0 for artificials AFTER we pivot them out.
      // Easier way to construct starting Phase 1 tableau:
      // Start with Row 0 having '1's at artificial columns. Then subtract constraint rows to make artificials 0 in Row 0.
      // Or simpler: Initial Row 0 = Sum (all rows with artificials) * -1 (to move to LHS?)
      // Let's do standard operations.
      // Start: Z* = -A1 - A2... => Z* + A1 + A2 ... = 0.
      // So matrix[0][artIdx] = 1.
      const artIndices: number[] = [];
      headers.forEach((h, i) => {
        if (h.startsWith('a')) {
           matrix[0][i] = 1; 
           artIndices.push(i);
        }
      });
      
      // Now eliminate these 1s from the basis columns by row operations.
      // For each artificial variable, find its row (where it is 1) and subtract that row from Row 0.
      artIndices.forEach(artCol => {
        // Find row where this artificial is the basis (coefficient 1)
        for(let r=1; r<numRows; r++) {
          if(matrix[r][artCol] === 1) {
             // Row 0 = Row 0 - 1 * Row r
             for(let c=0; c<colCount; c++) {
               matrix[0][c] -= matrix[r][c];
             }
          }
        }
      });

      // SOLVE PHASE 1
      const phase1Result = runSimplexIterations(matrix, headers, initialBasis, steps, 1);
      if (phase1Result === 'UNBOUNDED') return { status: 'UNBOUNDED', steps, finalValues: {}, zValue: 0 };

      // CHECK FEASIBILITY
      // If Min Z* (Phase 1 obj) is not 0 (or very close), then infeasible.
      // Note: In our setup Max (-Sum A), optimal should be 0.
      if (Math.abs(matrix[0][RHS_COL]) > 1e-5) {
         return { status: 'INFEASIBLE', steps, finalValues: {}, zValue: 0 };
      }

      // PREPARE PHASE 2
      phase = 2;
      
      // Restore original objective function
      // We need to take originalObjRow and apply the same row operations that were applied to the basis variables to zero them out?
      // No, easier: Replace Row 0 with original coeffs, then perform row ops to zero out current basic variables.
      matrix[0] = originalObjRow;
      
      // If artificials are still in basis (at zero level), we technically should drive them out, 
      // but for this simple solver, we can just ignore their columns or keep them.
      // Standard Two-Phase removes artificial columns.
      // We will just zero out the basic variables in the new Row 0.
      initialBasis.forEach((basisCol, rowMinus1) => {
        const row = rowMinus1 + 1;
        const basisCoeffInObj = matrix[0][basisCol];
        if (Math.abs(basisCoeffInObj) > 1e-9) {
           // Row 0 = Row 0 - basisCoeff * Row 'row'
           for(let c=0; c<colCount; c++) {
             matrix[0][c] -= basisCoeffInObj * matrix[row][c];
           }
        }
      });

      // Continue solving Phase 2
       const phase2Result = runSimplexIterations(matrix, headers, initialBasis, steps, 2);
       if (phase2Result !== 'OPTIMAL') return { status: phase2Result, steps, finalValues: {}, zValue: 0 };

    } else if (isBigM && artificialVars.length > 0) {
      // --- BIG M METHOD ---
      // Modify Obj Row: 
      // Max Z -> Subtract M*Ai.  => Z - CjXj + M*Ai = 0.
      // Min Z -> Add M*Ai. => Min Z equiv Max -Z. Let Z' = -Z. Z = -Z'. -Z' + CjXj + M*Ai = 0? 
      // Standard: Maximize Z - sum(M * Ai).
      // Z - C X + M A = 0 ? No.
      // Obj: Z = C X - M A  => Z - C X + M A = 0.
      // So coeff of A in row 0 is +M.
      // Then eliminate A from basis.
      
      // If Min: Min Z = C X + M A => Max Z' = -C X - M A. 
      // Z' + C X + M A = 0. Coeff of A is +M.
      
      // So in both cases (normalized), coeff of A in Row 0 is +M (or +LargeVal).
      
      const artIndices: number[] = [];
      headers.forEach((h, i) => {
        if (h.startsWith('a')) {
           matrix[0][i] = M_VAL; 
           artIndices.push(i);
        }
      });

      // Zero out artificials in Row 0
      artIndices.forEach(artCol => {
        for(let r=1; r<numRows; r++) {
          if(matrix[r][artCol] === 1) {
             // Row 0 = Row 0 - M * Row r
             for(let c=0; c<colCount; c++) {
               matrix[0][c] -= M_VAL * matrix[r][c];
             }
          }
        }
      });

      const res = runSimplexIterations(matrix, headers, initialBasis, steps, 0);
      if (res !== 'OPTIMAL') return { status: res, steps, finalValues: {}, zValue: 0 };

      // Check feasibility for Big M
      // If any artificial variable is in the basis with a positive value, it's infeasible.
      const artInBasis = initialBasis.some((colIdx, i) => {
         const name = headers[colIdx];
         const val = matrix[i+1][RHS_COL];
         return name.startsWith('a') && val > 1e-5;
      });
      if (artInBasis) return { status: 'INFEASIBLE', steps, finalValues: {}, zValue: 0 };

    } else {
      // --- STANDARD SIMPLEX ---
      // If user selected Simplex but we have artificial vars needed (>= or =),
      // strictly speaking simplex doesn't start. 
      // But if we treat them as slacks? No, math breaks.
      // We'll assume standard simplex is only used for <= constraints. 
      // If constraints required artificials but method is SIMPLEX, it might fail or act weird.
      // We'll just run it.
       const res = runSimplexIterations(matrix, headers, initialBasis, steps, 0);
       if (res !== 'OPTIMAL') return { status: res, steps, finalValues: {}, zValue: 0 };
    }

    // EXTRACT RESULTS
    const finalValues: Record<string, number> = {};
    // Initialize all vars to 0
    headers.slice(1, -1).forEach(h => finalValues[h] = 0);
    
    // Read basis
    initialBasis.forEach((colIdx, rowIdx) => {
      const varName = headers[colIdx];
      finalValues[varName] = matrix[rowIdx+1][RHS_COL];
    });

    let zValue = matrix[0][RHS_COL];
    // If Max, Z is correct. If Min, we optimized -Z, so Z = -Z'. 
    // However, note the row 0 equation: Z + ... = RHS. 
    // In Min case (Max -Z), variable is Z' = -Z. So RHS is Z'. Real Z = -RHS.
    if (isMin) {
      zValue = -zValue;
    }

    return {
      status: 'OPTIMAL',
      steps,
      finalValues,
      zValue
    };

  } catch (e) {
    console.error(e);
    return { status: 'ERROR', steps: [], finalValues: {}, zValue: 0, errorMessage: 'Error interno de cálculo' };
  }
};

// The Iteration Loop
function runSimplexIterations(
  matrix: number[][], 
  headers: string[], 
  basis: number[], 
  steps: TableauStep[],
  phase: number
): 'OPTIMAL' | 'UNBOUNDED' | 'INFEASIBLE' {
  
  const maxIter = 50;
  let iter = 0;
  const colCount = matrix[0].length;
  const rowCount = matrix.length;
  const RHS_COL = colCount - 1;

  while (iter < maxIter) {
    // 1. Save current step
    const currentTableauRows: TableauRow[] = [];
    for(let r=0; r<rowCount; r++) {
       currentTableauRows.push({
         basicVar: r === 0 ? (phase === 1 ? 'W' : 'Z') : headers[basis[r-1]],
         coefficients: matrix[r],
         rhs: matrix[r][RHS_COL]
       });
    }
    
    // 2. Check Optimality
    // Look for most negative coefficient in Row 0 (for maximization standard form)
    let enteringCol = -1;
    let minVal = -1e-9; // tolerance

    for(let c=1; c<colCount-1; c++) {
       if (matrix[0][c] < minVal) {
         minVal = matrix[0][c];
         enteringCol = c;
       }
    }

    // If no negative coefficients, we are optimal
    if (enteringCol === -1) {
      steps.push({
        stepIndex: steps.length + 1,
        description: `Solución Óptima encontrada (${phase > 0 ? 'Fase ' + phase : 'Final'}).`,
        tableau: currentTableauRows,
        headers,
        basicVars: basis.map(i => headers[i]),
        isPhase1: phase === 1,
        phase
      });
      return 'OPTIMAL';
    }

    // 3. Determine Leaving Variable (Ratio Test)
    let leavingRow = -1;
    let minRatio = Infinity;

    for(let r=1; r<rowCount; r++) {
      const pivotVal = matrix[r][enteringCol];
      if (pivotVal > 1e-9) {
        const ratio = matrix[r][RHS_COL] / pivotVal;
        if (ratio < minRatio) {
          minRatio = ratio;
          leavingRow = r;
        }
      }
    }

    const enteringVarName = headers[enteringCol];
    
    if (leavingRow === -1) {
      steps.push({
        stepIndex: steps.length + 1,
        description: `Solución no acotada detectada. Variable entrante ${enteringVarName} no tiene pivote positivo.`,
        tableau: currentTableauRows,
        headers,
        basicVars: basis.map(i => headers[i]),
        isPhase1: phase === 1,
        phase
      });
      return 'UNBOUNDED';
    }

    const leavingVarName = headers[basis[leavingRow-1]];

    steps.push({
      stepIndex: steps.length + 1,
      description: `Iteración ${iter + 1}: Entra ${enteringVarName}, Sale ${leavingVarName}. Pivote en fila ${leavingRow}, col ${enteringCol}.`,
      tableau: currentTableauRows,
      headers,
      basicVars: basis.map(i => headers[i]),
      pivotRow: leavingRow,
      pivotCol: enteringCol,
      enteringVar: enteringVarName,
      leavingVar: leavingVarName,
      isPhase1: phase === 1,
      phase
    });

    // 4. Pivot Operations
    // a) Normalize pivot row
    const pivotValue = matrix[leavingRow][enteringCol];
    for(let c=0; c<colCount; c++) {
      matrix[leavingRow][c] /= pivotValue;
    }

    // b) Eliminate other rows
    for(let r=0; r<rowCount; r++) {
      if (r !== leavingRow) {
        const factor = matrix[r][enteringCol];
        if (Math.abs(factor) > 1e-9) {
          for(let c=0; c<colCount; c++) {
            matrix[r][c] -= factor * matrix[leavingRow][c];
          }
        }
      }
    }

    // Update Basis
    basis[leavingRow-1] = enteringCol;
    
    iter++;
  }
  return 'UNBOUNDED'; // Hit max iterations
}