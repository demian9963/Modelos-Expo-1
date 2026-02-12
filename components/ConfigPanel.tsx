import React from 'react';
import { OptimizationType, SolverMethod } from '../types';
import { METHOD_LABELS } from '../constants';
import { Settings, ArrowRight } from 'lucide-react';

interface ConfigPanelProps {
  numVars: number;
  setNumVars: (n: number) => void;
  numConstraints: number;
  setNumConstraints: (n: number) => void;
  optType: OptimizationType;
  setOptType: (t: OptimizationType) => void;
  method: SolverMethod;
  setMethod: (m: SolverMethod) => void;
  onNext: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  numVars, setNumVars,
  numConstraints, setNumConstraints,
  optType, setOptType,
  method, setMethod,
  onNext
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6 text-slate-800">
        <Settings className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Configuración del Problema</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variables */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Número de Variables (Decisión)</label>
          <input 
            type="number" 
            min="1" 
            max="10"
            value={numVars}
            onChange={(e) => setNumVars(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {/* Constraints */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Número de Restricciones</label>
          <input 
            type="number" 
            min="1" 
            max="10"
            value={numConstraints}
            onChange={(e) => setNumConstraints(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        {/* Optimization Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Objetivo</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setOptType('MAX')}
              className={`flex-1 py-2 px-4 rounded-lg border transition ${optType === 'MAX' ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              Maximizar
            </button>
            <button 
              onClick={() => setOptType('MIN')}
              className={`flex-1 py-2 px-4 rounded-lg border transition ${optType === 'MIN' ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              Minimizar
            </button>
          </div>
        </div>

        {/* Method Selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Método de Resolución</label>
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value as SolverMethod)}
            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="SIMPLEX">{METHOD_LABELS.SIMPLEX}</option>
            <option value="BIG_M">{METHOD_LABELS.BIG_M}</option>
            <option value="TWO_PHASE">{METHOD_LABELS.TWO_PHASE}</option>
          </select>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={onNext}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm"
        >
          Continuar
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
