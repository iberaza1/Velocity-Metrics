import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { 
  History, 
  Target, 
  Sparkles, 
  Beer,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Coach from './components/Coach';
import Goals from './components/Goals';
import BeerTracker from './components/BeerTracker';
import { Run, UserGoals, BeerLog } from './types';
import { useAuth } from './context/AuthContext'; // For current user
import { db } from './config'; // Your Firestore db instance
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

const VelocityLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 6L10 18L13 12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 6L18 18L21 12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
  </svg>
);

const App: React.FC = () => {
  const { user } = useAuth(); // Get logged-in user (null if not logged in)
  const [runs, setRuns] = useState<Run[]>([]);

  const [beerLogs, setBeerLogs] = useState<BeerLog[]>(() => {
    const saved = localStorage.getItem('velocity_beers');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<UserGoals>(() => {
    const saved = localStorage.getItem('velocity_goals');
    return saved ? JSON.parse(saved) : { weeklyMi: 20, monthlyMi: 80, weightLbs: 175 };
  });

  useEffect(() => {
    localStorage.setItem('velocity_runs', JSON.stringify(runs));
  }, [runs]);

  useEffect(() => {
    localStorage.setItem('velocity_beers', JSON.stringify(beerLogs));
  }, [beerLogs]);

  useEffect(() => {
    localStorage.setItem('velocity_goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
  const loadRuns = async () => {
    if (user) {
      try {
        const q = query(
          collection(db, `users/${user.uid}/runs`),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const loadedRuns = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Run));
        setRuns(loadedRuns);
        console.log('Runs loaded from Firestore for user:', user.uid);
      } catch (error) {
        console.error('Error loading runs from Firestore:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('velocity_runs');
        if (saved) setRuns(JSON.parse(saved));
      }
    } else {
      // Not logged in: use localStorage
      const saved = localStorage.getItem('velocity_runs');
      if (saved) {
        setRuns(JSON.parse(saved));
      }
    }
  };

  loadRuns();
}, [user]); // Reload when login status changes
  
  const addRun = async (newRun: Run) => {
  const runWithTimestamp = {
    ...newRun,
    timestamp: new Date().toISOString(), // For sorting
  };

  // Immediate local UI update
  setRuns((prev) => [runWithTimestamp, ...prev]);

  // Save to Firestore if logged in
  if (user) {
    try {
      const docRef = await addDoc(
        collection(db, `users/${user.uid}/runs`),
        runWithTimestamp
      );
      // Optional: Update local run with real Firestore ID
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRun.id ? { ...r, id: docRef.id } : r
        )
      );
      console.log('Run saved to Firestore:', docRef.id);
    } catch (error) {
      console.error('Error saving run to Firestore:', error);
      // App continues with local data if offline/error
    }
  }

  // Always fallback save to localStorage (for offline/no login)
  localStorage.setItem('velocity_runs', JSON.stringify(runs));
};

  const addBeer = (newBeer: BeerLog) => {
    setBeerLogs(prev => [newBeer, ...prev]);
  };

  const removeBeer = (id: string) => {
    setBeerLogs(prev => prev.filter(b => b.id !== id));
  };

  const updateGoals = (newGoals: UserGoals) => {
    setGoals(newGoals);
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col pb-20 md:pb-0 md:pl-20">
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <VelocityLogo className="text-slate-900 w-5 h-5" />
            </div>
            <h1 className="font-black text-xl tracking-tighter text-cyan-400">Velocity<span className="text-white">Metrics</span></h1>
          </div>
        </header>

        <nav className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-20 bg-slate-950 border-r border-slate-800 py-8 items-center gap-8 z-50">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-cyan-500/10 hover:scale-105 transition-transform cursor-pointer">
            <VelocityLogo className="text-slate-900 w-7 h-7" />
          </div>
          <NavIcon to="/" icon={<Zap />} label="Tracker" />
          <NavIcon to="/history" icon={<LayoutDashboard />} label="Terminal" />
          <NavIcon to="/beer" icon={<Beer />} label="Consumables" />
          <NavIcon to="/coach" icon={<Sparkles />} label="AI Coach" />
          <NavIcon to="/goals" icon={<Target />} label="Profile" />
        </nav>

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Tracker onSaveRun={addRun} userWeightLbs={goals.weightLbs} />} />
            <Route path="/history" element={<Dashboard runs={runs} />} />
            <Route path="/beer" element={<BeerTracker logs={beerLogs} runs={runs} onAddLog={addBeer} onRemoveLog={removeBeer} />} />
            <Route path="/coach" element={<Coach runs={runs} beerLogs={beerLogs} goals={goals} />} />
            <Route path="/goals" element={<Goals runs={runs} goals={goals} onUpdateGoals={updateGoals} />} />
          </Routes>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 h-20 flex items-center justify-around px-4 z-50">
          <MobileNavIcon to="/" icon={<Zap />} label="Track" />
          <MobileNavIcon to="/history" icon={<LayoutDashboard />} label="Dashboard" />
          <MobileNavIcon to="/beer" icon={<Beer />} label="Fuel" />
          <MobileNavIcon to="/coach" icon={<Sparkles />} label="Coach" />
          <MobileNavIcon to="/goals" icon={<Target />} label="Goals" />
        </nav>
      </div>
    </HashRouter>
  );
};

const NavIcon = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      p-3 rounded-xl transition-all duration-300 group relative
      ${isActive ? 'bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
    `}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
    <span className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-2xl">
      {label}
    </span>
  </NavLink>
);

const MobileNavIcon = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `
      flex flex-col items-center gap-1 transition-all
      ${isActive ? 'text-cyan-400 scale-110' : 'text-slate-500 opacity-70'}
    `}
  >
    {({ isActive }) => (
      <>
        {React.cloneElement(icon as React.ReactElement<any>, { className: isActive ? "w-6 h-6" : "w-5 h-5" })}
        <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
      </>
    )}
  </NavLink>
);

export default App;
