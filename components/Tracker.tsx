import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, MapPin, Timer, Activity, LocateFixed, Volume2, VolumeX, Zap, MoveUp, Compass, Globe, Info, Satellite, Wifi, ShieldAlert, Pause } from 'lucide-react';
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
 * Renders high-confidence kinematic nodes relative to the start point.
 */
const KinematicCanvas: React.FC<{ path: Coordinate[], isTracking: boolean, isBlocked: boolean }> = ({ path, isTracking, isBlocked }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width = canvas.offsetWidth * dpr;
    const h = canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (path.length < 2) return;

    const padding = 60;
    const innerW = canvas.offsetWidth - padding * 2;
    const innerH = canvas.offsetHeight - padding * 2;

    const lats = path.map(p => p.lat);
    const lngs = path.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const latDiff = maxLat - minLat || 0.0001;
    const lngDiff = maxLng - minLng || 0.0001;

    const scale = Math.min(innerW / lngDiff, innerH / latDiff);
    const offsetX = (canvas.offsetWidth - lngDiff * scale) / 2;
    const offsetY = (canvas.offsetHeight - latDiff * scale) / 2;

    const project = (p: Coordinate) => ({
      x: offsetX + (p.lng - minLng) * scale,
      y: offsetY + (maxLat - p.lat) * scale
    });

    // Strategic Grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.offsetWidth; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.offsetHeight); ctx.stroke();
    }
    for (let i = 0; i < canvas.offsetHeight; i += 60) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.offsetWidth, i); ctx.stroke();
    }

    // High-Confidence Vector Path
    ctx.beginPath();
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.4)';

    const start = project(path[0]);
    ctx.moveTo(start.x, start.y);

    path.forEach((p) => {
      const pos = project(p);
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.stroke();

    // Beacon for Current Position
    const end = project(path[path.length - 1]);
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
    ctx.fill();

  }, [path, isBlocked]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

const Tracker: React.FC<TrackerProps> = ({ onSaveRun, userWeightLbs }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [path, setPath] = useState<Coordinate[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentPower, setCurrentPower] = useState(0);
  const [totalAscent, setTotalAscent] = useState(0);
  const [mapBlocked, setMapBlocked] = useState(false);
  const [showErrorHelp, setShowErrorHelp] = useState(false);
  const [hasGpsFix, setHasGpsFix] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const powersRef = useRef<number[]>([]);
  const lastTimestampRef = useRef<number>(0);

  useEffect(() => {
    (window as any).gm_authFailure = () => setMapBlocked(true);

    const initialize = async () => {
      try {
        await MapService.load();
        navigator.geolocation.getCurrentPosition(
          (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
          () => initMap(37.7749, -122.4194),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } catch (err) {
        setMapBlocked(true);
      }
    };
    initialize();

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (timerId.current !== null) clearInterval(timerId.current);
      delete (window as any).gm_authFailure;
    };
  }, []);

  const initMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || !(window as any).google || mapBlocked) return;

    try {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat, lng },
        zoom: 18,
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
    setDuration(0);
    setDistance(0);
    setPath([]);
    setTotalAscent(0);
    setHasGpsFix(false);
    setCurrentPower(0);
    powersRef.current = [];
    lastCoordRef.current = null;
    lastTimestampRef.current = Date.now();
    
    if (polylineRef.current && !mapBlocked) {
      try { polylineRef.current.setPath([]); } catch(e) {}
    }

    setIsTracking(true);
    setIsPaused(false);
    initiateHardwareWatch();
  };

  const initiateHardwareWatch = () => {
    // Timer
    if (timerId.current) clearInterval(timerId.current);
    timerId.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // GPS Watch
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, altitude, speed, accuracy } = pos.coords;
        const now = Date.now();
        if (accuracy > 25) return;

        setHasGpsFix(true);
        const newCoord: Coordinate = { lat, lng, elevation: altitude ?? undefined };
        
        if (lastCoordRef.current) {
          const distMi = calculateDistanceBetween(lastCoordRef.current.lat, lastCoordRef.current.lng, lat, lng);
          const timeDeltaSec = (now - lastTimestampRef.current) / 1000;
          const calculatedSpeed = distMi * 1609.34 / (timeDeltaSec || 1);
          if (calculatedSpeed > 12) return;

          const isSignificantMove = distMi > 0.0093; // ~15 meters

          if (isSignificantMove) {
            const elevationDiff = (altitude ?? 0) - (lastCoordRef.current.elevation ?? altitude ?? 0);
            if (elevationDiff > 0) setTotalAscent(a => a + elevationDiff * METERS_TO_FEET);
            const velocityMps = speed ?? calculatedSpeed;
            const power = estimatePower(userWeightLbs, velocityMps, elevationDiff / (distMi * 1609.34 || 1));
            
            setCurrentPower(power);
            powersRef.current.push(power);
            setDistance(d => d + distMi);

            if (googleMapRef.current && markerRef.current && !mapBlocked) {
              const latLng = new google.maps.LatLng(lat, lng);
              markerRef.current.setPosition(latLng);
              googleMapRef.current.panTo(latLng);
              if (polylineRef.current) polylineRef.current.getPath().push(latLng);
            }

            setPath(prev => [...prev, newCoord]);
            lastCoordRef.current = newCoord;
            lastTimestampRef.current = now;
          }
        } else {
          lastCoordRef.current = newCoord;
          setPath(prev => prev.length === 0 ? [newCoord] : prev);
          lastTimestampRef.current = now;
          if (googleMapRef.current && markerRef.current && !mapBlocked) {
            const latLng = new google.maps.LatLng(lat, lng);
            markerRef.current.setPosition(latLng);
          }
        }
      },
      () => setHasGpsFix(false),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const pauseTracking = () => {
    if (timerId.current) clearInterval(timerId.current);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setIsPaused(true);
    setCurrentPower(0);
  };

  const resumeTracking = () => {
    setIsPaused(false);
    // Reset last coordination ref on resume to avoid jump distance calculation from pre-pause location
    lastCoordRef.current = null;
    initiateHardwareWatch();
  };

  const stopTracking = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (timerId.current !== null) clearInterval(timerId.current);
    
    const finalDistance = distance;
    const finalDuration = duration;
    const finalPath = path;

    setIsTracking(false);
    setIsPaused(false);
    setHasGpsFix(false);

    if (finalDistance > 0.01) {
      const avgPower = powersRef.current.length > 0 
        ? powersRef.current.reduce((a, b) => a + b, 0) / powersRef.current.length 
        : 0;
      
      onSaveRun({
        id: `run-${Date.now()}`,
        date: new Date().toISOString(),
        distanceMi: finalDistance,
        durationSec: finalDuration,
        paceMinMi: calculatePace(finalDistance, finalDuration),
        avgPowerWatts: avgPower,
        totalAscentFt: totalAscent,
        path: finalPath
      });
    }
  };

  const displayPace = distance < 0.01 ? "0:00" : formatPace(calculatePace(distance, duration));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
            <Compass className="text-cyan-400 w-8 h-8" />
            KINEMATIC TERMINAL
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Wifi size={10} className={isTracking && !isPaused ? "text-cyan-500 animate-pulse" : "text-slate-700"} />
              LINK: {isTracking ? (isPaused ? "PAUSED" : "ACTIVE") : "STANDBY"}
            </p>
            <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 uppercase tracking-tighter">
              Drift_Filter_v3.1
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all ${isVoiceEnabled ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-500/10' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Assist</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <TelemetryCard icon={<Timer />} label="Session_Timer" value={formatDuration(duration)} isActive={isTracking && !isPaused} highlight />
          <TelemetryCard icon={<MapPin />} label="Displacement" value={`${distance.toFixed(2)} mi`} color="text-cyan-400" />
          <TelemetryCard icon={<Zap />} label="Avg_Power" value={`${Math.round(currentPower)} W`} color="text-indigo-400" />
          <TelemetryCard icon={<MoveUp />} label="Vertical_Gain" value={`${Math.round(totalAscent)} ft`} color="text-emerald-400" />
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="h-[480px] w-full bg-slate-950 border border-slate-800 rounded-[2rem] sm:rounded-[3.5rem] relative overflow-hidden shadow-2xl">
            {!mapBlocked ? (
               <div ref={mapContainerRef} className="absolute inset-0 z-0 opacity-80" />
            ) : (
               <div className="absolute inset-0 bg-slate-900 bg-[linear-gradient(rgba(15,23,42,0.8)_2px,transparent_2px),linear-gradient(90deg,rgba(15,23,42,0.8)_2px,transparent_2px)] bg-[size:40px_40px]" />
            )}
            
            <KinematicCanvas path={path} isTracking={isTracking} isBlocked={mapBlocked} />

            <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-20">
              <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/5 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-2xl">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full animate-pulse ${isPaused ? 'bg-amber-500 shadow-[0_0_10px_orange]' : (mapBlocked ? 'bg-slate-500' : 'bg-cyan-500 shadow-[0_0_12px_cyan]')}`} />
                <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.4em]">SPS_KINETIC_MATRIX_V6</span>
              </div>
            </div>

            {isTracking && !isPaused && !hasGpsFix && (
               <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-slate-950/90 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse backdrop-blur-md">
                  <Satellite size={12} /> SECURING_SATELLITE_FIX...
               </div>
            )}
            
            {isPaused && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center z-30 pointer-events-none">
                <div className="bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
                  <Pause className="text-amber-500 w-5 h-5 fill-amber-500" />
                  <span className="text-amber-500 font-black uppercase text-xs tracking-[0.3em]">Kinematics Paused</span>
                </div>
              </div>
            )}

            {mapBlocked && !showErrorHelp && (
              <button 
                onClick={() => setShowErrorHelp(true)}
                className="absolute top-6 right-6 z-20 bg-slate-900/95 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[9px] font-black text-amber-500 uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                <Info size={12} /> DIAGNOSTICS
              </button>
            )}

            {!isTracking && !path.length && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[2px] pointer-events-none z-10">
                 <LocateFixed className="w-12 h-12 sm:w-16 sm:h-16 text-slate-800 mb-4 animate-pulse" />
                 <p className="font-black uppercase tracking-[0.6em] text-[9px] sm:text-[10px] text-slate-700">Awaiting_Movement_Signal</p>
              </div>
            )}
          </div>

          <div className="bg-slate-950 border border-cyan-500/20 p-10 sm:p-14 rounded-[2.5rem] sm:rounded-[3.5rem] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 text-cyan-400 mb-4 relative z-10">
              <Activity className={`w-5 h-5 sm:w-6 h-6 ${isTracking && !isPaused ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.5em]">Relative Velocity</span>
            </div>
            <div className="text-6xl sm:text-9xl font-mono font-black text-white tracking-tighter leading-none relative z-10">
              {displayPace}
              <span className="text-xl sm:text-2xl text-slate-700 font-sans ml-3 sm:ml-6 uppercase tracking-widest">/ mi</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4">
        {!isTracking ? (
          <button 
            onClick={startTracking}
            className="w-full py-8 sm:py-12 rounded-[2rem] sm:rounded-[4rem] font-black text-xl sm:text-4xl uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-6 sm:gap-10 border-b-[10px] sm:border-b-[16px] bg-cyan-600 hover:bg-cyan-500 border-cyan-800 shadow-cyan-900/40 text-white"
          >
            <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
            INITIATE_SESSION
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row w-full gap-4 sm:gap-6 animate-in slide-in-from-bottom-6 duration-500">
            {isPaused ? (
              <button 
                onClick={resumeTracking}
                className="flex-1 py-6 sm:py-10 rounded-[2rem] sm:rounded-[3rem] font-black text-lg sm:text-2xl uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 border-b-[8px] sm:border-b-[12px] bg-amber-600 hover:bg-amber-500 border-amber-800 shadow-amber-900/40 text-white"
              >
                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                Resume Session
              </button>
            ) : (
              <button 
                onClick={pauseTracking}
                className="flex-1 py-6 sm:py-10 rounded-[2rem] sm:rounded-[3rem] font-black text-lg sm:text-2xl uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 border-b-[8px] sm:border-b-[12px] bg-amber-600 hover:bg-amber-500 border-amber-800 shadow-amber-900/40 text-white"
              >
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                Pause Session
              </button>
            )}
            
            <button 
              onClick={stopTracking}
              className={`flex-1 py-6 sm:py-10 rounded-[2rem] sm:rounded-[3rem] font-black text-lg sm:text-2xl uppercase tracking-[0.1em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 border-b-[8px] sm:border-b-[12px] ${isPaused ? 'bg-white text-slate-900 border-slate-300' : 'bg-red-600 text-white border-red-800 shadow-red-900/40'}`}
            >
              <Square className={`w-6 h-6 sm:w-8 sm:h-8 ${isPaused ? 'fill-slate-900' : 'fill-white'}`} />
              Terminate Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TelemetryCard = ({ icon, label, value, color = "text-white", isActive = false, highlight = false }: { icon: any, label: string, value: string, color?: string, isActive?: boolean, highlight?: boolean }) => (
  <div className={`bg-slate-900/60 border border-slate-800 p-8 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl backdrop-blur-md transition-all hover:bg-slate-900/80 ${highlight && isActive ? 'ring-2 ring-cyan-500/30 border-cyan-500/20' : ''}`}>
    <div className="flex items-center gap-3 sm:gap-4 text-slate-500 mb-4 sm:mb-6 uppercase tracking-[0.3em] text-[10px] font-black">
      {React.cloneElement(icon, { className: `w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-cyan-400' : ''}` })} {label}
    </div>
    <div className={`text-3xl sm:text-4xl font-mono font-black tracking-tighter ${color}`}>
      {value}
    </div>
  </div>
);

export default Tracker;