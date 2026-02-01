
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Layout from './components/Layout';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Goals from './components/Goals';
import Coach from './components/Coach';
import BeerTracker from './components/BeerTracker';
import { useData } from './hooks/useData';

function AuthenticatedApp() {
  const { runs, goals, beerLogs, saveRun, updateGoals, logBeer, loading } = useData();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] text-cyan-400">
        <div className="animate-pulse font-mono tracking-widest text-xs uppercase">Initializing Kinematic Systems...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Tracker onSaveRun={saveRun} userWeightLbs={goals.weightLbs} />} />
        <Route path="/dashboard" element={<Dashboard runs={runs} />} />
        <Route path="/goals" element={<Goals runs={runs} goals={goals} onUpdateGoals={updateGoals} />} />
        <Route path="/coach" element={<Coach runs={runs} beerLogs={beerLogs} goals={goals} />} />
        <Route path="/beer" element={<BeerTracker logs={beerLogs} runs={runs} onAddLog={logBeer} onRemoveLog={() => { }} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AuthenticatedApp />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
