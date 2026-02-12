import React, { useState, useEffect } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { DataInput } from './components/DataInput';
import { SolutionView } from './components/SolutionView';
import { Constraint, OptimizationType, SolveResult, SolverMethod } from './types';
import { solveLinearProgram } from './services/solver';
import { INITIAL_VARS, INITIAL_CONSTRAINTS } from './constants';
import { BrainCircuit } from 'lucide-react';

function App() {
  // State Machine: 'SETUP' -> 'INPUT' -> 'RESULT'
  const [step, setStep] = useState<'SETUP' | 'INPUT' | 'RESULT'>('SETUP');

  // Configuration State
  const [numVars, setNumVars] = useState(INITIAL_VARS);
  const [numConstraints, setNumConstraints] = useState(INITIAL_CONSTRAINTS);
  const [optType, setOptType] = useState<OptimizationType>('MAX');
  const [method, setMethod] = useState<SolverMethod>('SIMPLEX');

  // Data State
  const [objCoeffs, setObjCoeffs] = useState<number[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);

  // Result State
  const [result, setResult] = useState<SolveResult | null>(null);

  // Initialize data structures when config changes
  useEffect(() => {
    if (step === 'SETUP') {
      // Reset data when going back to setup is not strictly necessary, 
      // but checking bounds is good.
    }
  }, [step]);

  const handleSetupNext = () => {
    // Initialize arrays
    const newObjCoeffs = Array(numVars).fill(0);
    const newConstraints = Array(numConstraints).fill(null).map((_, i) => ({
      id: `c-${i}`,
      coefficients: Array(numVars).fill(0),
      relation: '<=' as const, // Default
      rhs: 0
    }));

    // Preserve existing values if resizing (optional enhancement, simplified here to reset or simplistic slice)
    // For better UX, we could map old values. For now, fresh start on dimension change is safer.
    setObjCoeffs(newObjCoeffs);
    setConstraints(newConstraints);
    setStep('INPUT');
  };

  const handleSolve = () => {
    const res = solveLinearProgram(method, optType, objCoeffs, constraints);
    setResult(res);
    setStep('RESULT');
  };

  const handleReset = () => {
    setStep('SETUP');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Calcu PL</h1>
              <p className="text-xs text-slate-500 font-medium">Calculadora de Programación Lineal</p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">
              v1.0.0
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        
        {step === 'SETUP' && (
          <ConfigPanel
            numVars={numVars}
            setNumVars={setNumVars}
            numConstraints={numConstraints}
            setNumConstraints={setNumConstraints}
            optType={optType}
            setOptType={setOptType}
            method={method}
            setMethod={setMethod}
            onNext={handleSetupNext}
          />
        )}

        {step === 'INPUT' && (
          <DataInput
            numVars={numVars}
            numConstraints={numConstraints}
            optType={optType}
            objCoeffs={objCoeffs}
            setObjCoeffs={setObjCoeffs}
            constraints={constraints}
            setConstraints={setConstraints}
            onBack={() => setStep('SETUP')}
            onSolve={handleSolve}
          />
        )}

        {step === 'RESULT' && result && (
          <SolutionView 
            result={result} 
            onReset={handleReset} 
          />
        )}

      </main>
      
      <footer className="bg-slate-50 border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Simplex Solver Pro. Cálculo en el navegador.</p>
      </footer>
    </div>
  );
}

export default App;
