import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Square, MapPin, Timer, Activity, LocateFixed, Volume2, VolumeX, Zap, MoveUp, Compass, AlertCircle, ShieldAlert, Globe, Copy, Check, Info } from 'lucide-react';
import { Run, Coordinate } from '../types';
import { calculatePace, formatPace, formatDuration, calculateDistanceBetween, estimatePower, METERS_TO_FEET } from '../utils/conversions';
import { MapService } from '../services/mapService';

declare var google: any;

interface TrackerProps {
  onSaveRun: (run: Run) => void;
  userWeightLbs: number;
}

/**
 * Tactical Vector Canvas
 * Renders GPS coordinates relative to the starting point when the Map API is restricted.
 */
const KinematicCanvas: React.FC<{ path: Coordinate[], isTracking: boolean }> = ({ path, isTracking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || path.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and setup
    const w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, w, h);

    // Drawing Constants
    const padding = 60;
    const innerW = canvas.offsetWidth - padding * 2;
    const innerH = canvas.offsetHeight - padding * 2;

    // Calculate Bounds
    const lats = path.map(p => p.lat);
    const lngs = path.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latDiff = maxLat - minLat || 0.0001;
    const lngDiff = maxLng - minLng || 0.0001;

    // Scale Logic (preserve aspect ratio)
    const scale = Math.min(innerW / lngDiff, innerH / latDiff);
    const offsetX = (canvas.offsetWidth - lngDiff * scale) / 2;
    const offsetY = (canvas.offsetHeight - latDiff * scale) / 2;

    const project = (p: Coordinate) => ({
      x: offsetX + (p.lng - minLng) * scale,
      y: offsetY + (maxLat - p.lat) * scale // Invert Y for screen space
    });

    // Draw Grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.offsetWidth; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.offsetHeight); ctx.stroke();
    }
    for (let i = 0; i < canvas.offsetHeight; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.offsetWidth, i); ctx.stroke();
    }

    // Draw Path
    ctx.beginPath();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.5)';

    const start = project(path[0]);
    ctx.moveTo(start.x, start.y);

    path.forEach((p, i) => {
      const pos = project(p);
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.stroke();

    // Draw End Pulse
    const end = project(path[path.length - 1]);
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
    ctx.fill();

  }, [path]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const Tracker: React.FC<TrackerProps> = ({ onSaveRun, userWeightLbs }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [path, setPath] = useState<Coordinate[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentPower, setCurrentPower] = useState(0);
  const [totalAscent, setTotalAscent] = useState(0);
  const [mapBlocked, setMapBlocked] = useState(false);
  const [showErrorHelp, setShowErrorHelp] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const powersRef = useRef<number[]>([]);

  useEffect(() => {
    // Advanced Detection for Blocked Map via specific console error types
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes("ApiTargetBlockedMapError")) {
        setMapBlocked(true);
      }
      originalError.apply(console, args);
    };

    (window as any).gm_authFailure = () => setMapBlocked(true);

    const initialize = async () => {
      try {
        await MapService.load();
        navigator.geolocation.getCurrentPosition(
          (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
          () => initMap(37.7749, -122.4194),
          { enableHighAccuracy: true }
        );
      } catch (err) {
        setMapBlocked(true);
      }
    };
    initialize();

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerId.current) clearInterval(timerId.current);
      console.error = originalError;
    };
  }, []);

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || !(window as any).google || mapBlocked) return;

    try {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat, lng },
        zoom: 17,
        mapTypeId: 'terrain',
        disableDefaultUI: true,
        styles: MapService.getDarkMapStyles(),
        tilt: 45
      });

      polylineRef.current = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#22d3ee',
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: googleMapRef.current
      });

      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: "Current Position",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#06b6d4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 8
        }
      });
    } catch (e) {
      setMapBlocked(true);
    }
  };

  const startTracking = () => {
    setIsTracking(true);
    setDuration(0);
    setDistance(0);
    setPath([]);
    setTotalAscent(0);
    powersRef.current = [];
    lastCoordRef.current = null;
    if (polylineRef.current) polylineRef.current.setPath([]);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, altitude, speed } = pos.coords;
        const newCoord: Coordinate = { lat, lng, elevation: altitude ?? undefined };
        
        if (googleMapRef.current && markerRef.current && !mapBlocked) {
          const latLng = new google.maps.LatLng(lat, lng);
          markerRef.current.setPosition(latLng);
          googleMapRef.current.panTo(latLng);
        }

        if (lastCoordRef.current) {
          const distMi = calculateDistanceBetween(lastCoordRef.current.lat, lastCoordRef.current.lng, lat, lng);
          
          if (distMi > 0.0005) { 
            const elevationDiff = (altitude ?? 0) - (lastCoordRef.current.elevation ?? altitude ?? 0);
            if (elevationDiff > 0) setTotalAscent(a => a + elevationDiff * METERS_TO_FEET);

            const velocityMps = speed ?? (distMi * 1609.34);
            const grade = distMi > 0 ? elevationDiff / (distMi * 1609.34) : 0;
            const power = estimatePower(userWeightLbs, velocityMps, grade);
            
            setCurrentPower(power);
            powersRef.current.push(power);
            setDistance(d => d + distMi);

            if (polylineRef.current && !mapBlocked) {
              const polyPath = polylineRef.current.getPath();
              polyPath.push(new google.maps.LatLng(lat, lng));
            }

            setPath(prev => [...prev, newCoord]);
            lastCoordRef.current = newCoord;
          }
        } else {
          lastCoordRef.current = newCoord;
          setPath([newCoord]);
          if (polylineRef.current && !mapBlocked) {
            polylineRef.current.getPath().push(new google.maps.LatLng(lat, lng));
          }
        }
      },
      (err) => console.error("Geolocation Error:", err),
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    timerId.current = window.setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
  };

  const stopTracking = () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    if (timerId.current) clearInterval(timerId.current);
    setIsTracking(false);

    if (distance > 0.01) {
      const avgPower = powersRef.current.length > 0 
        ? powersRef.current.reduce((a, b) => a + b, 0) / powersRef.current.length 
        : 0;
      
      onSaveRun({
        id: `run-${Date.now()}`,
        date: new Date().toISOString(),
        distanceMi: distance,
        durationSec: duration,
        paceMinMi: calculatePace(distance, duration),
        avgPowerWatts: avgPower,
        totalAscentFt: totalAscent,
        path: path
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
            <Compass className="text-cyan-400 w-8 h-8" />
            KINEMATIC TERMINAL
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Status: Operational_Link_Secured</p>
            {mapBlocked && (
              <span className="flex items-center gap-1 text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase tracking-tighter animate-pulse">
                <Activity size={10} /> Vector_Path_Simulation
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all ${isVoiceEnabled ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Audio_Assist</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <TelemetryCard icon={<Timer />} label="Session_Timer" value={formatDuration(duration)} />
          <TelemetryCard icon={<MapPin />} label="Displacement" value={`${distance.toFixed(2)} mi`} color="text-cyan-400" />
          <TelemetryCard icon={<Zap />} label="Performance_Power" value={`${Math.round(currentPower)} W`} color="text-indigo-400" />
          <TelemetryCard icon={<MoveUp />} label="Vertical_Gain" value={`${Math.round(totalAscent)} ft`} color="text-emerald-400" />
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="h-[480px] w-full bg-slate-950 border border-slate-800 rounded-[2rem] sm:rounded-[3.5rem] relative overflow-hidden shadow-2xl transition-all duration-700">
            {/* Base Layer: Map or Canvas */}
            <div ref={mapContainerRef} className={`absolute inset-0 z-0 transition-opacity duration-1000 ${mapBlocked ? 'opacity-0' : 'opacity-100'}`} />
            
            {(mapBlocked || path.length > 0) && (
              <KinematicCanvas path={path} isTracking={isTracking} />
            )}

            {/* Tactical Overlays */}
            <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
              <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/5 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-2xl">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse shadow-[0_0_12px_cyan] ${mapBlocked ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.4em]">SPS_TERRAIN_MATRIX_V5.0</span>
              </div>
            </div>

            {mapBlocked && !showErrorHelp && (
              <button 
                onClick={() => setShowErrorHelp(true)}
                className="absolute top-6 right-6 z-10 bg-slate-900/90 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black text-amber-500 uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                <Info size={12} /> RESTRICTED_KEY_FIX
              </button>
            )}

            {showErrorHelp && (
              <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in zoom-in-95">
                <div className="max-w-xs text-center space-y-4">
                  <Globe className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                  <h4 className="text-white font-black uppercase text-xs tracking-widest">Map Authentication Error</h4>
                  <p className="text-slate-400 text-[10px] font-mono leading-relaxed">
                    Your Google Maps API key has domain restrictions. To see the map here, add your preview origin to the allowed list in Google Cloud Console.
                  </p>
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[9px] text-cyan-400 break-all">
                    {window.location.origin}/*
                  </div>
                  <button 
                    onClick={() => setShowErrorHelp(false)}
                    className="w-full py-3 bg-slate-800 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-colors"
                  >
                    Dismiss & Use Simulation
                  </button>
                </div>
              </div>
            )}
            
            {!isTracking && !path.length && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px] pointer-events-none">
                 <LocateFixed className="w-12 h-12 sm:w-16 sm:h-16 text-slate-800 mb-4 animate-pulse" />
                 <p className="font-black uppercase tracking-[0.6em] sm:tracking-[0.8em] text-[9px] sm:text-[10px] text-slate-700">Awaiting_Kinematic_Start</p>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-cyan-500/20 p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 text-cyan-400 mb-4 relative z-10">
              <Activity className="w-5 h-5 sm:w-6 h-6" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em]">Relative Velocity</span>
            </div>
            <div className="text-6xl sm:text-9xl font-mono font-black text-white tracking-tighter leading-none relative z-10">
              {formatPace(calculatePace(distance, duration))}
              <span className="text-xl sm:text-2xl text-slate-700 font-sans ml-3 sm:ml-6 uppercase tracking-widest">/ mi</span>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={isTracking ? stopTracking : startTracking}
        className={`w-full py-8 sm:py-12 rounded-[2rem] sm:rounded-[4rem] font-black text-xl sm:text-4xl uppercase tracking-[0.1em] sm:tracking-[0.3em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 sm:gap-10 border-b-[8px] sm:border-b-[16px] ${
          isTracking 
            ? 'bg-red-600 hover:bg-red-500 border-red-800 shadow-red-900/40' 
            : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-800 shadow-cyan-900/40'
        }`}
      >
        {isTracking ? <Square className="w-8 h-8 sm:w-12 sm:h-12 fill-current" /> : <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />}
        {isTracking ? 'TERMINATE_SESSION' : 'INITIATE_SESSION'}
      </button>
    </div>
  );
};

const TelemetryCard = ({ icon, label, value, color = "text-white" }: { icon: any, label: string, value: string, color?: string }) => (
  <div className="bg-slate-900/60 border border-slate-800 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl backdrop-blur-md transition-all hover:bg-slate-900/80 hover:border-slate-700">
    <div className="flex items-center gap-3 sm:gap-4 text-slate-500 mb-4 sm:mb-6 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[9px] sm:text-[11px] font-black">
      {React.cloneElement(icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })} {label}
    </div>
    <div className={`text-2xl sm:text-4xl font-mono font-black tracking-tighter ${color}`}>{value}</div>
  </div>
);

export default Tracker;