import React from 'react';
import { Constraint, OptimizationType, Relation } from '../types';
import { Calculator, ArrowRight, ArrowLeft } from 'lucide-react';

interface DataInputProps {
  numVars: number;
  numConstraints: number;
  optType: OptimizationType;
  objCoeffs: number[];
  setObjCoeffs: (c: number[]) => void;
  constraints: Constraint[];
  setConstraints: (c: Constraint[]) => void;
  onBack: () => void;
  onSolve: () => void;
}

export const DataInput: React.FC<DataInputProps> = ({
  numVars,
  numConstraints,
  optType,
  objCoeffs, setObjCoeffs,
  constraints, setConstraints,
  onBack,
  onSolve
}) => {

  const handleObjChange = (idx: number, val: string) => {
    const newCoeffs = [...objCoeffs];
    newCoeffs[idx] = parseFloat(val) || 0;
    setObjCoeffs(newCoeffs);
  };

  const handleConstraintChange = (rowIdx: number, field: 'coef' | 'rhs' | 'rel', colIdxOrVal: number | string | Relation, val?: string) => {
    const newConstraints = [...constraints];
    const constraint = { ...newConstraints[rowIdx] };

    if (field === 'coef' && typeof colIdxOrVal === 'number' && val !== undefined) {
      const newCoeffs = [...constraint.coefficients];
      newCoeffs[colIdxOrVal] = parseFloat(val) || 0;
      constraint.coefficients = newCoeffs;
    } else if (field === 'rhs' && typeof colIdxOrVal === 'string') {
      constraint.rhs = parseFloat(colIdxOrVal) || 0;
    } else if (field === 'rel' && typeof colIdxOrVal === 'string') {
      constraint.relation = colIdxOrVal as Relation;
    }

    newConstraints[rowIdx] = constraint;
    setConstraints(newConstraints);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6 text-slate-800">
        <Calculator className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Ingreso de Datos</h2>
      </div>

      <div className="space-y-8">
        {/* Objective Function */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">1</span>
            Función Objetivo ({optType === 'MAX' ? 'Maximizar' : 'Minimizar'} Z)
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif italic text-lg text-slate-600">Z =</span>
            {Array.from({ length: numVars }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={objCoeffs[i] || ''}
                  placeholder="0"
                  onChange={(e) => handleObjChange(i, e.target.value)}
                  className="w-20 p-2 border border-slate-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="font-medium text-slate-600">x<sub>{i + 1}</sub></span>
                {i < numVars - 1 && <span className="text-slate-400">+</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Constraints */}
        <div>
          <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
             <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">2</span>
             Restricciones
          </h3>
          <div className="space-y-4">
            {constraints.map((constraint, rowIdx) => (
              <div key={constraint.id} className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-400 w-6">R{rowIdx + 1}</span>
                
                {/* Coefficients */}
                {Array.from({ length: numVars }).map((_, colIdx) => (
                  <div key={colIdx} className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={constraint.coefficients[colIdx] || ''}
                      placeholder="0"
                      onChange={(e) => handleConstraintChange(rowIdx, 'coef', colIdx, e.target.value)}
                      className="w-16 p-1.5 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-sm text-slate-600">x<sub>{colIdx + 1}</sub></span>
                    {colIdx < numVars - 1 && <span className="text-slate-400">+</span>}
                  </div>
                ))}

                {/* Relation */}
                <select
                  value={constraint.relation}
                  onChange={(e) => handleConstraintChange(rowIdx, 'rel', e.target.value)}
                  className="mx-2 p-1.5 border border-slate-300 rounded bg-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="<=">≤</option>
                  <option value=">=">≥</option>
                  <option value="=">=</option>
                </select>

                {/* RHS */}
                <input
                  type="number"
                  step="any"
                  value={constraint.rhs || ''}
                  placeholder="0"
                  onChange={(e) => handleConstraintChange(rowIdx, 'rhs', e.target.value)}
                  className="w-20 p-1.5 border border-slate-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 px-4 py-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <button 
          onClick={onSolve}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg font-medium transition shadow-sm shadow-green-200"
        >
          <Calculator className="w-4 h-4" />
          Resolver
        </button>
      </div>
    </div>
  );
};
