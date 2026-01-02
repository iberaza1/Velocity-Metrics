
import React, { useState } from 'react';
import { Target, TrendingUp, Award, Calendar, CheckCircle2, UserCircle } from 'lucide-react';
import { Run, UserGoals } from '../types';

interface GoalsProps {
  runs: Run[];
  goals: UserGoals;
  onUpdateGoals: (goals: UserGoals) => void;
}

const Goals: React.FC<GoalsProps> = ({ runs, goals, onUpdateGoals }) => {
  const [editing, setEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const weeklyDistance = runs
    .filter(r => new Date(r.date) >= weekAgo)
    .reduce((acc, r) => acc + r.distanceMi, 0);

  const monthlyDistance = runs
    .filter(r => new Date(r.date) >= monthStart)
    .reduce((acc, r) => acc + r.distanceMi, 0);

  const weeklyPercent = Math.min(100, (weeklyDistance / goals.weeklyMi) * 100);
  const monthlyPercent = Math.min(100, (monthlyDistance / goals.monthlyMi) * 100);

  const handleSave = () => {
    onUpdateGoals(tempGoals);
    setEditing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-cyan-400 font-bold uppercase tracking-widest text-[10px] mb-1">Success Metrics</p>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Target className="text-cyan-400 w-8 h-8" />
            Milestones
          </h2>
        </div>
        <button 
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            editing ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
          }`}
        >
          {editing ? 'Update Profile' : 'Adjust Targets'}
        </button>
      </header>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-xl">
           <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700">
             <UserCircle className="w-8 h-8 text-slate-400" />
           </div>
           <div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Body Composition</p>
             <p className="text-2xl font-mono font-black text-white">{goals.weightLbs} <span className="text-xs text-slate-500 uppercase font-sans">lbs</span></p>
           </div>
        </div>

        {/* Weekly Goal Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Weekly Progress</span>
              </div>
              <div className="text-4xl font-black text-white">
                {weeklyDistance.toFixed(1)} 
                <span className="text-lg text-slate-500 font-medium ml-2">/ {goals.weeklyMi} mi</span>
              </div>
            </div>
            <Award className={`w-12 h-12 ${weeklyPercent >= 100 ? 'text-cyan-400' : 'text-slate-700'}`} />
          </div>

          <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000"
              style={{ width: `${weeklyPercent}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{weeklyPercent.toFixed(0)}% Complete</span>
            {weeklyPercent >= 100 && (
              <span className="text-emerald-400 flex items-center gap-1 text-[10px] font-black uppercase animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> Goal Met!
              </span>
            )}
          </div>
        </div>

        {/* Monthly Goal Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-8 rounded-[2.5rem] shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Monthly Objective</span>
              </div>
              <div className="text-4xl font-black text-white">
                {monthlyDistance.toFixed(1)} 
                <span className="text-lg text-slate-500 font-medium ml-2">/ {goals.monthlyMi} mi</span>
              </div>
            </div>
            <Award className={`w-12 h-12 ${monthlyPercent >= 100 ? 'text-amber-400' : 'text-slate-700'}`} />
          </div>

          <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-900 shadow-inner">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>

          <div className="mt-4 flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{monthlyPercent.toFixed(0)}% Complete</span>
            {monthlyPercent >= 100 && (
              <span className="text-amber-400 flex items-center gap-1 text-[10px] font-black uppercase animate-bounce">
                <CheckCircle2 className="w-4 h-4" /> Legend Status!
              </span>
            )}
          </div>
        </div>

        {/* Editing UI */}
        {editing && (
          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-emerald-500/30 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
            <h3 className="font-black text-white uppercase text-xs tracking-widest mb-6">Quant System Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">Weight (lbs)</label>
                <input 
                  type="number" 
                  value={tempGoals.weightLbs}
                  onChange={e => setTempGoals({ ...tempGoals, weightLbs: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xl font-mono font-black text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">Weekly Goal (mi)</label>
                <input 
                  type="number" 
                  value={tempGoals.weeklyMi}
                  onChange={e => setTempGoals({ ...tempGoals, weeklyMi: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xl font-mono font-black text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase font-black ml-1 tracking-widest">Monthly Goal (mi)</label>
                <input 
                  type="number" 
                  value={tempGoals.monthlyMi}
                  onChange={e => setTempGoals({ ...tempGoals, monthlyMi: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xl font-mono font-black text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Goals;
