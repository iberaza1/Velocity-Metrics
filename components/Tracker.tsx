import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, MapPin, Timer, Activity, LocateFixed, Volume2, VolumeX, Zap, MoveUp, Compass, AlertCircle, CloudCheck, CloudOff, Loader2 } from 'lucide-react';
import { Run, Coordinate } from '../types';
import { calculatePace, formatPace, formatDuration, calculateDistanceBetween, estimatePower, METERS_TO_FEET } from '../utils/conversions';
import { MapService } from '../services/mapService';

declare var google: any;

interface TrackerProps {
  onSaveRun: (run: Run) => void;
  userWeightLbs: number;
}

const Tracker: React.FC<TrackerProps> = ({ onSaveRun, userWeightLbs }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [path, setPath] = useState<Coordinate[]>([]);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [currentPower, setCurrentPower] = useState(0);
  const [totalAscent, setTotalAscent] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const watchId = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const powersRef = useRef<number[]>([]);

  useEffect(() => {
    const initialize = async () => {
      try {
        await MapService.load();
        navigator.geolocation.getCurrentPosition(
          (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
          () => initMap(37.7749, -122.4194),
          { enableHighAccuracy: true }
        );
      } catch (err) {
        setMapError("Map Load Failed: Check Domain Restrictions in Google Cloud Console.");
      }
    };
    initialize();

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerId.current) clearInterval(timerId.current);
    };
  }, []);

  const initMap = async (lat: number, lng: number) => {
    if (!mapContainerRef.current || !(window as any).google) return;

    try {
      const { Map } = await google.maps.importLibrary("maps");
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

      googleMapRef.current = new Map(mapContainerRef.current, {
        center: { lat, lng },
        zoom: 17,
        mapTypeId: 'terrain',
        disableDefaultUI: true,
        styles: MapService.getDarkMapStyles(),
        tilt: 45,
        mapId: "DEMO_MAP_ID",
      });

      polylineRef.current = new google.maps.Polyline({
        path: [],
        geodesic: true,
        strokeColor: '#22d3ee',
        strokeOpacity: 0.9,
        strokeWeight: 6,
        map: googleMapRef.current
      });

      const pin = new PinElement({
        background: "#0891b2",
        borderColor: "#ffffff",
        glyphColor: "#ffffff",
        scale: 1.2
      });

      markerRef.current = new AdvancedMarkerElement({
        position: { lat, lng },
        map: googleMapRef.current,
        title: "Runner Position",
        content: pin.element,
      });
    } catch (err) {
      setMapError("The 'Oops' error is likely a Domain Restriction on your API key. This is expected in the preview window.");
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
        
        if (googleMapRef.current && markerRef.current) {
          const latLng = { lat, lng };
          markerRef.current.position = latLng;
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

            if (polylineRef.current) {
              const polyPath = polylineRef.current.getPath();
              polyPath.push(new google.maps.LatLng(lat, lng));
            }

            setPath(prev => [...prev, newCoord]);
            lastCoordRef.current = newCoord;
          }
        } else {
          lastCoordRef.current = newCoord;
          setPath([newCoord]);
          if (polylineRef.current) {
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

  const stopTracking = async () => {
    if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    if (timerId.current) clearInterval(timerId.current);
    setIsTracking(false);

    if (distance > 0.01) {
      setIsSyncing(true);
      const avgPower = powersRef.current.length > 0 
        ? powersRef.current.reduce((a, b) => a + b, 0) / powersRef.current.length 
        : 0;
      
      try {
        await onSaveRun({
          id: `run-${Date.now()}`,
          date: new Date().toISOString(),
          distanceMi: distance,
          durationSec: duration,
          paceMinMi: calculatePace(distance, duration),
          avgPowerWatts: avgPower,
          totalAscentFt: totalAscent,
          path: path
        });
      } finally {
        setTimeout(() => setIsSyncing(false), 2000); // Visual confirmation delay
      }
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
            {isSyncing ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-black uppercase tracking-tighter animate-pulse">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Transmission_Active
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-tighter">
                <CloudCheck className="w-2.5 h-2.5" /> Firestore_Synced
              </div>
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
          <div className="h-[480px] w-full bg-slate-950 border border-slate-800 rounded-[2rem] sm:rounded-[3.5rem] relative overflow-hidden shadow-2xl">
            
          {/* TEMPORARY: Fully commented out map error overlay to test UI/login/buttons. 
          To revert: Remove the outer {/* and */} wrappers. */}

          {/*
            {mapError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900 z-50">
                <div className="bg-slate-950/80 p-8 rounded-[2rem] border border-red-500/20 max-w-sm">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-white font-black uppercase tracking-widest mb-2 text-sm">RESTRICTED_ACCESS</h3>
                  <p className="text-slate-400 text-[10px] font-mono leading-relaxed">{mapError}</p>
                  <p className="mt-4 text-cyan-500 text-[9px] font-black uppercase tracking-widest border border-cyan-500/20 p-2 rounded">Maps will work on your Live Site</p>
                </div>
              </div>
            ) : (    
              <>
                <div ref={mapContainerRef} className="absolute inset-0 z-0" />
                <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
                  <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/5 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-2xl">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_12px_cyan]" />
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.4em]">SPS_Terrain_Matrix_v5.0</span>
                  </div>
                </div>
              </>
            )}
            */}

            {/* Always show blank map container + label (no error overlay) */}
            <>
              <div ref={mapContainerRef} className="absolute inset-0 z-0" />
              <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
                <div className="bg-slate-950/80 backdrop-blur-2xl border border-white/5 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-2xl">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_12px_cyan]" />
                  <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.4em]">SPS_Terrain_Matrix_v5.0</span>
                </div>
              </div>
            </>
            {!isTracking && !path.length && !mapError && (
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
        disabled={isSyncing}
        className={`w-full py-8 sm:py-12 rounded-[2rem] sm:rounded-[4rem] font-black text-xl sm:text-4xl uppercase tracking-[0.1em] sm:tracking-[0.3em] transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-4 sm:gap-10 border-b-[8px] sm:border-b-[16px] ${
          isSyncing ? 'bg-slate-800 border-slate-900 cursor-not-allowed text-slate-600' :
          isTracking 
            ? 'bg-red-600 hover:bg-red-500 border-red-800 shadow-red-900/40' 
            : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-800 shadow-cyan-900/40'
        }`}
      >
        {isSyncing ? <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin" /> :
         isTracking ? <Square className="w-8 h-8 sm:w-12 sm:h-12 fill-current" /> : <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />}
        {isSyncing ? 'SYNCING_DATA...' : isTracking ? 'TERMINATE_SESSION' : 'INITIATE_SESSION'}
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
