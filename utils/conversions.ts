
/**
 * VelocityMetrics Math Logic
 * US Customary System (Miles/Pounds)
 */

export const METERS_TO_MILES = 0.000621371;
export const METERS_TO_FEET = 3.28084;
export const LBS_TO_KG = 0.453592;

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [
    h > 0 ? h.toString().padStart(2, '0') : null,
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].filter(Boolean).join(':');
};

export const calculatePace = (distanceMi: number, durationSec: number): number => {
  if (distanceMi === 0) return 0;
  return (durationSec / 60) / distanceMi;
};

export const formatPace = (paceMinMi: number): string => {
  if (!paceMinMi || paceMinMi === Infinity) return "0:00";
  const mins = Math.floor(paceMinMi);
  const secs = Math.round((paceMinMi - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const calculateDistanceBetween = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Enhanced Running Power Estimation (Watts)
 * P = (m*g*(grade + Cr) + 0.5*rho*CdA*v^2) * v
 */
export const estimatePower = (weightLbs: number, velocityMps: number, gradeDecimal: number): number => {
  if (velocityMps <= 0) return 0;
  
  const massKg = weightLbs * LBS_TO_KG;
  const gravity = 9.81;
  const rollingResCoeff = 0.01; // Average running economy factor
  const rho = 1.225; // Air density kg/m3
  const cdA = 0.5; // Drag coeff * frontal area
  
  const forceGravity = massKg * gravity * gradeDecimal;
  const forceRolling = massKg * gravity * rollingResCoeff;
  const forceAir = 0.5 * rho * cdA * Math.pow(velocityMps, 2);
  
  return (forceGravity + forceRolling + forceAir) * velocityMps;
};

export const calculatePearsonR = (data: { x: number; y: number }[]): number => {
  if (data.length < 2) return 0;
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of data) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return denominator === 0 ? 0 : numerator / denominator;
};
