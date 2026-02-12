import React from 'react';
import { SolveResult, TableauStep } from '../types';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface SolutionViewProps {
  result: SolveResult;
  onReset: () => void;
}

const formatNumber = (num: number) => {
  if (Math.abs(num) < 1e-9) return "0";
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2).replace(/\.00$/, '');
};

export const SolutionView: React.FC<SolutionViewProps> = ({ result, onReset }) => {
  
  return (
    <div className="space-y-8 pb-20">
      {/* Header Status */}
      <div className={`p-6 rounded-xl border flex items-start gap-4 ${
        result.status === 'OPTIMAL' ? 'bg-green-50 border-green-200 text-green-900' :
        result.status === 'INFEASIBLE' ? 'bg-red-50 border-red-200 text-red-900' :
        'bg-yellow-50 border-yellow-200 text-yellow-900'
      }`}>
        {result.status === 'OPTIMAL' && <CheckCircle className="w-6 h-6 shrink-0 text-green-600" />}
        {result.status === 'INFEASIBLE' && <XCircle className="w-6 h-6 shrink-0 text-red-600" />}
        {result.status === 'UNBOUNDED' && <AlertTriangle className="w-6 h-6 shrink-0 text-yellow-600" />}
        
        <div>
          <h2 className="text-lg font-bold mb-1">
            {result.status === 'OPTIMAL' && 'Solución Óptima Encontrada'}
            {result.status === 'INFEASIBLE' && 'Problema Infactible'}
            {result.status === 'UNBOUNDED' && 'Solución No Acotada'}
            {result.status === 'ERROR' && 'Error de Cálculo'}
          </h2>
          <p className="text-sm opacity-90">
            {result.errorMessage || (
               result.status === 'OPTIMAL' 
               ? `Valor Objetivo Z = ${formatNumber(result.zValue)}`
               : 'No se pudo encontrar una solución óptima finita.'
            )}
          </p>
        </div>
      </div>

      {/* Iteration Steps */}
      {result.steps.map((step, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-slate-800">Paso {step.stepIndex}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
            </div>
            {step.isPhase1 && (
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">Fase 1</span>
            )}
             {step.phase === 2 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Fase 2</span>
            )}
          </div>
          
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="bg-slate-100 border border-slate-300 p-2 text-left font-semibold text-slate-700 w-20">Base</th>
                  {step.headers.slice(0, -1).map((h, i) => (
                    <th key={i} className={`bg-slate-100 border border-slate-300 p-2 font-semibold text-slate-700 ${h === step.enteringVar ? 'bg-green-100' : ''}`}>
                      {h}
                    </th>
                  ))}
                  <th className="bg-slate-100 border border-slate-300 p-2 font-semibold text-slate-700">LD</th>
                </tr>
              </thead>
              <tbody>
                {step.tableau.map((row, rIdx) => {
                  const isPivotRow = rIdx === step.pivotRow;
                  return (
                    <tr key={rIdx} className={isPivotRow ? 'bg-blue-50' : ''}>
                      <td className={`border border-slate-300 p-2 font-medium ${row.basicVar === step.leavingVar ? 'bg-red-50' : ''}`}>
                        {row.basicVar}
                      </td>
                      {row.coefficients.slice(0, -1).map((val: number, cIdx: number) => {
                        // Pivot column index matches matrix index, which matches coefficient index
                        const isPivotCell = isPivotRow && cIdx === (step.pivotCol !== undefined ? step.pivotCol : -1);
                        
                        // Check if this column is the entering variable
                        const isEntering = step.headers[cIdx] === step.enteringVar;
                        
                        return (
                          <td key={cIdx} className={`border border-slate-300 p-2 text-center ${isPivotCell ? 'bg-yellow-200 font-bold border-yellow-400' : ''} ${isEntering ? 'bg-green-50/30' : ''}`}>
                            {formatNumber(val)}
                          </td>
                        );
                      })}
                      <td className="border border-slate-300 p-2 text-center font-semibold bg-slate-50">
                        {formatNumber(row.rhs)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Final Result Summary */}
      {result.status === 'OPTIMAL' && (
        <div className="bg-blue-900 text-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Resultados Finales</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="bg-blue-800/50 p-3 rounded-lg border border-blue-700">
              <span className="text-blue-200 text-sm block mb-1">Función Objetivo (Z)</span>
              <span className="text-2xl font-bold">{formatNumber(result.zValue)}</span>
            </div>
            {Object.entries(result.finalValues).map(([key, val]) => {
               if (!key.startsWith('x')) return null;
               return (
                <div key={key} className="bg-blue-800/50 p-3 rounded-lg border border-blue-700">
                  <span className="text-blue-200 text-sm block mb-1">{key}</span>
                  <span className="text-xl font-semibold">{formatNumber(val as number)}</span>
                </div>
               );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-8">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium transition"
        >
          <RefreshCw className="w-4 h-4" />
          Resolver otro problema
        </button>
      </div>
    </div>
  );
};