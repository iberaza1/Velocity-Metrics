
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Compass, BarChart3, Target, Brain, Beer, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/', icon: <Compass />, label: 'TRACKER' },
        { path: '/dashboard', icon: <BarChart3 />, label: 'DASHBOARD' },
        { path: '/goals', icon: <Target />, label: 'GOALS' },
        { path: '/coach', icon: <Brain />, label: 'COACH' },
        { path: '/beer', icon: <Beer />, label: 'BEER LOG' }
    ];

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-[#111] border-r border-[#222] p-6 justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-10 text-cyan-400">
                        <Compass className="w-8 h-8" />
                        <div>
                            <h1 className="font-black text-xl tracking-tighter leading-none text-white">VELOCITY</h1>
                            <p className="text-[10px] font-mono tracking-[0.3em] uppercase">Metric_Sys_v2</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${isActive
                                        ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                    }`
                                }
                            >
                                {React.cloneElement(item.icon as any, { size: 20 })}
                                <span className="text-xs font-black tracking-widest">{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <button
                    onClick={() => logout()}
                    className="flex items-center gap-4 px-4 py-3 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut size={20} />
                    <span className="text-xs font-black tracking-widest">DISCONNECT</span>
                </button>
            </aside>

            {/* Mobile/Tablet Content Area */}
            <main className="flex-1 overflow-auto relative scrollbar-hide">
                <div className="md:hidden flex items-center justify-between p-6 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <Compass className="w-6 h-6" />
                        <span className="font-black tracking-tighter text-white">VELOCITY</span>
                    </div>
                    <button onClick={() => logout()} className="text-slate-500">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="p-4 md:p-10 pb-24 md:pb-10 max-w-7xl mx-auto">
                    <Outlet />
                </div>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] flex justify-between shadow-2xl z-50">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center justify-center py-3 rounded-[1.5rem] transition-all ${isActive
                                    ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                                    : 'text-gray-500 active:scale-95'
                                }`
                            }
                        >
                            {React.cloneElement(item.icon as any, { size: 20 })}
                        </NavLink>
                    ))}
                </nav>
            </main>
        </div>
    );
};

export default Layout;
