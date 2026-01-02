
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Zap, History, ChevronRight, Ruler, Clock, TrendingUp, Gauge, Target, MoveUp } from 'lucide-react';
import { Run } from '../types';
import { formatDuration, formatPace, calculatePace } from '../utils/conversions';

interface DashboardProps {
  runs: Run[];
}

const Dashboard: React.FC<DashboardProps> = ({ runs }) => {
  const currentYear = new Date().getFullYear();
  
  const ytdMileage = runs
    .filter(r => new Date(r.date).getFullYear() === currentYear)
    .reduce((acc, r) => acc + r.distanceMi, 0);

  const totalMiles = runs.reduce((acc, r) => acc + r.distanceMi, 0);
  const totalDuration = runs.reduce((acc, r) => acc + r.durationSec, 0);
  const careerAvgPace = calculatePace(totalMiles, totalDuration);

  const chartData = [...runs].reverse().slice(-15).map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    avg_pace: parseFloat(r.paceMinMi.toFixed(2)),
    distance: parseFloat(r.distanceMi.toFixed(2))
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="h-1 w-8 bg-cyan-500 rounded-full" />
             <p className="text-cyan-400 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">Terminal Operational</p>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            PERFORMANCE TERMINAL
          </h1>
          <p className="text-slate-500 font-mono text-xs mt-1 uppercase tracking-widest">LOGGED_AS: ATHLETE_PRIME // v1.3.0</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none bg-slate-800/40 p-5 rounded-[2rem] border border-slate-700/50 backdrop-blur-md">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">YTD MILEAGE</p>
            <p className="text-2xl font-mono font-black text-white">
              {ytdMileage.toFixed(1)} <span className="text-xs text-cyan-500 font-sans">mi</span>
            </p>
          </div>
          <div className="flex-1 md:flex-none bg-slate-800/40 p-5 rounded-[2rem] border border-slate-700/50 backdrop-blur-md">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">EF INDEX</p>
            <p className="text-2xl font-mono font-black text-white">
              {(totalMiles > 0 ? careerAvgPace / totalMiles : 0).toFixed(3)}
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-slate-900/40 p-8 rounded-[3rem] border border-slate-800/60 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-32 h-32 text-cyan-500" />
          </div>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2 text-white uppercase tracking-tight">
                <Activity className="text-cyan-500 w-5 h-5" /> 
                Progression Curve
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Kinematic Variable: Pace (min/mi)</p>
            </div>
          </div>
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPace" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} fontFamily="JetBrains Mono" />
                <YAxis reversed stroke="#475569" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <Tooltip cursor={{ stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', fontSize: '12px' }} itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="avg_pace" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPace)" strokeWidth={4} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Target className="w-3 h-3 text-cyan-500" /> Career Metrics
             </h3>
             <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Volume</p>
                      <p className="text-2xl font-mono font-black text-white">{totalMiles.toFixed(1)} <span className="text-xs font-sans text-slate-500">mi</span></p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Avg Power</p>
                      <p className="text-2xl font-mono font-black text-indigo-400">
                        {Math.round(runs.reduce((a, r) => a + (r.avgPowerWatts || 0), 0) / (runs.length || 1))} W
                      </p>
                   </div>
                </div>
                <div className="h-px bg-slate-800/60" />
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Total Vertical</p>
                      <p className="text-2xl font-mono font-black text-emerald-400">
                        {Math.round(runs.reduce((a, r) => a + (r.totalAscentFt || 0), 0)).toLocaleString()} <span className="text-xs font-sans text-slate-500">ft</span>
                      </p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Sessions</p>
                      <p className="text-2xl font-mono font-black text-white">{runs.length}</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pb-12">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4" /> Mechanical History
          </h3>
        </div>
        
        {runs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {runs.map((run) => (
              <div key={run.id} className="bg-slate-800/10 border border-slate-800/40 hover:border-cyan-500/30 transition-all p-5 rounded-[2rem] group flex items-center gap-4 active:scale-[0.98] backdrop-blur-sm">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center shrink-0 shadow-lg group-hover:border-cyan-500/50">
                   <span className="text-[10px] font-black text-slate-500 uppercase">{new Date(run.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                   <span className="text-xl font-black text-white leading-tight">{new Date(run.date).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-white uppercase tracking-tighter">Session {run.id.slice(-4)}</span>
                    <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter border border-indigo-500/20">Kinematic</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Ruler className="w-3 h-3 text-cyan-400" />
                      <span className="font-mono text-white">{run.distanceMi.toFixed(2)}mi</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Activity className="w-3 h-3 text-emerald-400" />
                      <span className="font-mono text-white">{formatPace(run.paceMinMi)}/mi</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Zap className="w-3 h-3 text-indigo-400" />
                      <span className="font-mono text-white">{Math.round(run.avgPowerWatts || 0)}W</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MoveUp className="w-3 h-3 text-emerald-400" />
                      <span className="font-mono text-white">{Math.round(run.totalAscentFt || 0)}ft</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-700 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all w-5 h-5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-slate-900/30 border border-dashed border-slate-800 rounded-[3rem]">
            <History className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-600 font-black text-xs uppercase tracking-widest">Awaiting Biomechanical Data</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
