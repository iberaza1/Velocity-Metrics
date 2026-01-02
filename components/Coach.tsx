
import React, { useState } from 'react';
import { Brain, Zap, Loader2, AlertTriangle, Target, Activity, Droplets, ShieldCheck, Microscope, FlaskConical, Beaker, BarChart3, Binary, TrendingDown } from 'lucide-react';
import { Run, AssessmentResponse, BeerLog, UserGoals } from '../types';
import { GeminiService } from '../services/geminiService';
import { formatPace } from '../utils/conversions';

const gemini = new GeminiService();

interface CoachProps {
  runs: Run[];
  beerLogs: BeerLog[];
  goals: UserGoals;
}

const Coach: React.FC<CoachProps> = ({ runs, beerLogs, goals }) => {
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResponse | null>(null);

  const getAnalysis = async () => {
    if (runs.length === 0) return;
    setLoading(true);
    try {
      const result = await gemini.analyzePerformance(runs, beerLogs, goals);
      setAssessment(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Peaking': return 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5';
      case 'Improving': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
      case 'Overtraining': return 'text-red-400 border-red-400/30 bg-red-400/5';
      case 'Plateau': return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
      default: return 'text-slate-400 border-slate-800 bg-slate-800/20';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] mb-1">
            <Microscope className="w-3 h-3" /> PREDICTIVE ANALYSIS SYSTEM
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Biophysical Audit</h2>
        </div>
        {assessment && (
          <div className={`px-6 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-[0.2em] shadow-lg ${getStatusColor(assessment.status)}`}>
            {assessment.status} PROTOCOL ACTIVE
          </div>
        )}
      </header>

      {runs.length < 3 && !assessment ? (
        <div className="bg-slate-900/60 border border-slate-800 p-16 rounded-[3rem] text-center shadow-2xl backdrop-blur-xl">
          <FlaskConical className="w-16 h-16 text-slate-800 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white mb-4 uppercase">Kinematic Data Required</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            The Banister Model requires a minimum of <span className="text-cyan-400 font-bold">3 sessions</span> to establish TRIMP values and metabolic variance.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {!assessment && !loading && (
            <button 
              onClick={getAnalysis}
              className="w-full bg-slate-950 border border-indigo-500/20 py-24 rounded-[3.5rem] flex flex-col items-center justify-center gap-6 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_60px_rgba(99,102,241,0.15)] group"
            >
              <Brain className="w-16 h-16 text-indigo-400 animate-pulse group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <span className="text-white font-black tracking-[0.5em] text-xs uppercase block mb-2">GENERATE EXECUTIVE SUMMARY</span>
                <span className="text-[10px] text-slate-600 font-mono uppercase">Applying Impulse-Response Matrix</span>
              </div>
            </button>
          )}

          {loading && (
            <div className="py-32 flex flex-col items-center gap-8">
              <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />
              <div className="text-center">
                <p className="text-white font-black font-mono tracking-[0.2em] text-xl uppercase">Modeling Metabolic Tax...</p>
                <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Banister Fatigue Decay (Widmark Method)</p>
              </div>
            </div>
          )}

          {assessment && (
            <div className="space-y-8 animate-in zoom-in-95 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard label="Rolling Pace" value={formatPace(assessment.summary_metrics.rolling_avg_pace)} />
                <SummaryCard label="Efficiency Factor" value={assessment.summary_metrics.efficiency_factor.toFixed(3)} color="text-indigo-400" />
                <SummaryCard label="Correlation (r)" value={assessment.summary_metrics.correlation_coefficient.toFixed(3)} color="text-emerald-400" />
                <SummaryCard label="Metabolic Tax" value={`+${assessment.summary_metrics.metabolic_tax_estimate.toFixed(1)}s`} color="text-amber-500" />
                <SummaryCard label="Avg Power" value={`${Math.round(assessment.summary_metrics.mechanical_output_avg)}W`} />
              </div>

              <div className="space-y-6">
                <SectionCard 
                  icon={<Binary className="text-cyan-400" />} 
                  title="THE KINEMATIC UPDATE" 
                  content={assessment.executive_summary.kinematic_update} 
                />
                <SectionCard 
                  icon={<Beaker className="text-amber-500" />} 
                  title="THE BEER-PERFORMANCE MATRIX" 
                  content={assessment.executive_summary.beer_performance_matrix} 
                />
                <SectionCard 
                  icon={<Target className="text-indigo-400" />} 
                  title="THE ACTION PLAN" 
                  content={assessment.executive_summary.action_plan} 
                  isPrimary
                />
              </div>

              {assessment.anomalies.length > 0 && (
                <div className="bg-red-950/20 border border-red-500/20 p-8 rounded-[2.5rem] backdrop-blur-md">
                  <h3 className="font-black text-red-500 uppercase text-[10px] tracking-[0.4em] mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Variance Detected
                  </h3>
                  <div className="space-y-2">
                    {assessment.anomalies.map((a, i) => (
                      <div key={i} className="text-[10px] text-red-300 font-mono bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-center">
    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</div>
    <div className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{value}</div>
  </div>
);

const SectionCard = ({ icon, title, content, isPrimary = false }: { icon: any, title: string, content: string, isPrimary?: boolean }) => (
  <div className={`bg-slate-900/40 border ${isPrimary ? 'border-indigo-500/30' : 'border-slate-800'} p-10 rounded-[3rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group`}>
    <div className="flex items-center gap-4 mb-6">
      <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/5">
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <h3 className={`font-black uppercase text-sm tracking-[0.3em] ${isPrimary ? 'text-indigo-400' : 'text-white'}`}>{title}</h3>
    </div>
    <p className={`text-slate-300 leading-relaxed ${isPrimary ? 'text-lg font-bold text-white' : 'text-sm font-medium'}`}>
      {content}
    </p>
  </div>
);

export default Coach;
