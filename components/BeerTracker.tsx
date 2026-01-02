
import React, { useState, useMemo } from 'react';
import { 
  Beer, Plus, Minus, Trash2, Droplets, Zap, Flame, GlassWater, 
  Clock, Calculator, Info, Activity, TrendingUp, FlaskConical, Beaker,
  ChevronRight, History
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, 
  Cell, ResponsiveContainer, CartesianGrid 
} from 'recharts';
import { BeerLog, Run } from '../types';

interface BeerTrackerProps {
  logs: BeerLog[];
  runs: Run[];
  onAddLog: (log: BeerLog) => void;
  onRemoveLog: (id: string) => void;
}

// 1. DATA CONSTANTS: Standardized for Business Analytics
const BEER_LIBRARY = {
  "Coors Light": { abv: 4.2, kcal: 102, carbs: 5.0 },
  "Miller Lite": { abv: 4.2, kcal: 96, carbs: 3.2 },
  "Michelob Ultra": { abv: 4.2, kcal: 95, carbs: 2.6 },
  "Bud Light": { abv: 4.2, kcal: 110, carbs: 6.6 },
  "Bud Light Platinum": { abv: 6.0, kcal: 139, carbs: 4.4 },
  "Coors Banquet": { abv: 5.0, kcal: 145, carbs: 10.6 },
  "Keystone Light": { abv: 4.1, kcal: 101, carbs: 4.7 },
  "Busch Light": { abv: 4.1, kcal: 95, carbs: 3.2 },
  "Busch": { abv: 4.3, kcal: 114, carbs: 6.9 },
  "Budweiser": { abv: 5.0, kcal: 145, carbs: 10.6 },
  "Sierra Nevada IPA": { abv: 6.7, kcal: 210, carbs: 18.0 },
  "Sculpin IPA": { abv: 7.0, kcal: 210, carbs: 18.0 },
  "Imperial IPA": { abv: 8.5, kcal: 280, carbs: 22.0 }
};

const BeerPerformanceChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/60 p-12 rounded-[2rem] border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center">
        <TrendingUp className="w-12 h-12 text-slate-800 mb-4" />
        <h3 className="text-slate-600 font-black uppercase text-sm tracking-widest">Insufficient Correlation Data</h3>
        <p className="text-slate-700 text-[10px] mt-2 max-w-xs">Log runs and beer intake on consecutive days to populate the Metabolic Matrix.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 p-8 rounded-[2rem] border border-slate-800 shadow-2xl backdrop-blur-md">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Metabolic Correlation Matrix
          </h3>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight mt-1">
            Analyzing impact of Ethanol Load on subsequent Session Pace
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              type="number" 
              dataKey="beer_calories" 
              name="Prior Day Calories" 
              unit="kcal" 
              stroke="#475569" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              fontFamily="JetBrains Mono"
            />
            <YAxis 
              type="number" 
              dataKey="run_pace" 
              name="Run Pace" 
              unit="min/mi" 
              stroke="#475569" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              fontFamily="JetBrains Mono"
            />
            <ZAxis type="number" dataKey="abv" range={[100, 600]} name="Peak ABV" />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: '1px solid #1e293b', 
                borderRadius: '12px',
                fontSize: '11px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
              }}
              itemStyle={{ fontWeight: 'bold' }}
              formatter={(value, name) => [value, name === 'run_pace' ? 'Pace (min/mi)' : name]}
            />
            <Scatter name="Runs" data={data}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.abv > 7 ? '#ef4444' : '#06b6d4'} 
                  fillOpacity={0.6}
                  stroke={entry.abv > 7 ? '#ef4444' : '#06b6d4'}
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-6 text-[10px] font-mono font-bold uppercase tracking-wider justify-center">
        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          <span className="text-red-400">High ABV Performance Tax (>7%)</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
          <span className="text-cyan-400">Moderate Ethanol Load</span>
        </div>
      </div>
    </div>
  );
};

const BeerTracker: React.FC<BeerTrackerProps> = ({ logs, runs, onAddLog, onRemoveLog }) => {
  const [selectedBeerName, setSelectedBeerName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [volume, setVolume] = useState(12);
  const [timing, setTiming] = useState<'day_before' | 'day_of'>('day_before');

  const correlationData = useMemo(() => {
    return runs.map(run => {
      const runDate = new Date(run.date);
      const dayPrior = new Date(runDate.getTime() - 24 * 60 * 60 * 1000).toDateString();
      const relevantBeers = logs.filter(b => new Date(b.date).toDateString() === dayPrior);
      if (relevantBeers.length === 0) return null;
      return {
        beer_calories: relevantBeers.reduce((sum, b) => sum + b.calories, 0),
        run_pace: parseFloat(run.paceMinMi.toFixed(2)),
        abv: Math.max(...relevantBeers.map(b => b.abv)),
        label: runDate.toLocaleDateString()
      };
    }).filter(Boolean);
  }, [logs, runs]);

  const totals = useMemo(() => {
    if (!selectedBeerName) return { kcal: 0, carbs: 0, tax: "0.0" };
    const stats = BEER_LIBRARY[selectedBeerName as keyof typeof BEER_LIBRARY];
    const totalKcal = stats.kcal * quantity;
    const totalCarbs = stats.carbs * quantity;
    
    // Physics: Ethanol Mass (g) = Volume (oz) * (ABV/100) * Ethanol Density (0.789) * 29.57
    const totalEthanol = (volume * (stats.abv / 100) * 0.789 * 29.57) * quantity;
    const paceTax = (totalEthanol * 0.15).toFixed(1); 

    return { kcal: totalKcal, carbs: totalCarbs, tax: paceTax };
  }, [selectedBeerName, quantity, volume]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeerName) return;

    const stats = BEER_LIBRARY[selectedBeerName as keyof typeof BEER_LIBRARY];
    
    // We add logs in quantity for accurate history representation
    for (let i = 0; i < quantity; i++) {
      onAddLog({
        id: `${Date.now()}-${i}`,
        date: new Date().toISOString(),
        name: selectedBeerName,
        type: 'Consumable',
        abv: stats.abv,
        calories: stats.kcal,
        carbs: stats.carbs,
        volumeOz: volume,
        timing
      });
    }

    setSelectedBeerName(null);
    setQuantity(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-1">
            <Beaker className="w-3 h-3" />
            METABOLIC INPUT TERMINAL
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-white uppercase">Ethanol Analysis</h2>
        </div>
        <div className="bg-slate-800/40 px-4 py-2 rounded-xl border border-slate-700/50 flex items-center gap-3">
          <Info className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Physics-Aligned Widmark Model</span>
        </div>
      </header>

      <BeerPerformanceChart data={correlationData} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/60 border border-amber-500/20 p-8 rounded-[2.5rem] space-y-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40" />
            
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <FlaskConical className="text-amber-500 w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Metabolic Library</h3>
              </div>
              {selectedBeerName && (
                <div className="bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase">
                  {BEER_LIBRARY[selectedBeerName as keyof typeof BEER_LIBRARY].abv}% ABV
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(BEER_LIBRARY).map(bName => (
                <button
                  key={bName}
                  onClick={() => setSelectedBeerName(bName)}
                  className={`p-3 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tighter text-left ${
                    selectedBeerName === bName 
                    ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_15px_rgba(217,119,6,0.2)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {bName}
                </button>
              ))}
            </div>

            {selectedBeerName && (
              <form onSubmit={handleSubmit} className="space-y-4 pt-6 border-t border-slate-800 animate-in slide-in-from-top-2 duration-300">
                <div className="flex flex-wrap gap-4">
                  {/* Quantity Stepper */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Batch Quantity</label>
                    <div className="flex items-center bg-slate-800 border border-slate-700 rounded-2xl p-1">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 text-slate-400 hover:text-amber-500 transition-colors"><Minus size={16}/></button>
                      <span className="px-4 font-mono font-black text-lg text-white">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="p-3 text-slate-400 hover:text-amber-500 transition-colors"><Plus size={16}/></button>
                    </div>
                  </div>
                  
                  {/* Timing & Volume */}
                  <div className="flex-1 min-w-[150px] flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Temporal Lag</label>
                        <select 
                          className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-200 outline-none focus:border-amber-500/50 cursor-pointer"
                          value={timing}
                          onChange={(e) => setTiming(e.target.value as any)}
                        >
                          <option value="day_before">Day Prior (T-1)</option>
                          <option value="day_of">Day of Session (T)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Unit Vol (oz)</label>
                        <input 
                          type="number" 
                          value={volume}
                          onChange={(e) => setVolume(Number(e.target.value))}
                          className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl text-sm font-mono text-white outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Analytics Preview */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">AGGREGATE CARBS</p>
                    <p className="text-xl font-mono font-black text-white">{totals.carbs.toFixed(1)}<span className="text-xs ml-1 font-sans text-slate-600">g</span></p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">TOTAL KCAL</p>
                    <p className="text-xl font-mono font-black text-white">{Math.round(totals.kcal)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-5 bg-red-950/20 rounded-[2rem] border border-red-500/20">
                  <div className="text-red-400 text-[10px] uppercase font-black tracking-[0.3em] flex items-center gap-2">
                    <Calculator size={14} /> Predicted Performance Penalty
                  </div>
                  <div className="text-red-500 font-mono font-black text-2xl flex items-baseline">
                    +{totals.tax}<span className="text-[10px] ml-1 font-sans text-red-700 uppercase">s /mi</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-5 rounded-[2rem] transition-all shadow-lg flex items-center justify-center gap-3 group active:scale-[0.98]"
                >
                  <Beer className="w-5 h-5 group-hover:rotate-12 transition-transform" /> 
                  LOG {quantity} {selectedBeerName.toUpperCase()}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2.5rem] relative overflow-hidden backdrop-blur-md">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-500" /> Kinetic Inhibition Ledger
            </h3>
            <div className="text-[10px] font-mono text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              AUDIT_COUNT: {logs.length}
            </div>
          </div>
          <div className="space-y-4 max-h-[580px] overflow-y-auto no-scrollbar pr-2">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="bg-slate-950/40 border border-slate-800/40 p-5 rounded-3xl flex items-center justify-between group hover:border-amber-500/30 transition-all animate-in fade-in slide-in-from-right-2">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/5 flex flex-col items-center justify-center border border-amber-500/10 shrink-0">
                    <span className="text-amber-500 text-[10px] font-black leading-none">{log.abv}%</span>
                    <span className="text-[8px] text-slate-600 mt-1 uppercase">ABV</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[120px]">{log.name}</p>
                    <div className="flex gap-3 text-[9px] font-mono text-slate-500 uppercase font-bold mt-0.5">
                      <span>{log.volumeOz}oz</span>
                      <span>{Math.round(log.calories)} KCAL</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${log.timing === 'day_before' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} title={log.timing} />
                   <button 
                    onClick={() => onRemoveLog(log.id)}
                    className="p-3 text-slate-700 hover:text-red-400 rounded-xl transition-all hover:bg-red-500/10"
                    aria-label="Remove entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 opacity-20 flex flex-col items-center">
                <Activity className="w-12 h-12 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Biochemical Status: Neutral</p>
                <p className="text-[9px] mt-2 font-mono">No Kinetic Tax Pending</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeerTracker;
