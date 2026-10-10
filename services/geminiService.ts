
import { auth } from "./firebase";
import { Run, BeerLog, AssessmentResponse, UserGoals } from "../types";
import { calculatePearsonR } from "../utils/conversions";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const idToken = await user.getIdToken();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const data = await res.json(); if (data?.error) msg = data.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export class GeminiService {
  /**
   * VelocityMetrics Predictive Analytical Engine
   * Specializing in Sports Data Science & Metabolic Modeling
   */
  async analyzePerformance(history: Run[], beerHistory: BeerLog[], goals: UserGoals): Promise<AssessmentResponse> {
    // Mathematical Pre-Processing for Context
    const correlationData = history.map(run => {
      const runDate = new Date(run.date);
      const dayPrior = new Date(runDate.getTime() - 24 * 60 * 60 * 1000);
      
      const relevantBeers = beerHistory.filter(b => {
        const bDate = new Date(b.date);
        return bDate.toDateString() === dayPrior.toDateString();
      });

      const totalAlcoholUnits = relevantBeers.reduce((sum, b) => sum + ((b.volumeOz * b.abv) / 60), 0);
      return { x: totalAlcoholUnits, y: run.paceMinMi };
    }).filter(d => d.x > 0);

    const rFactor = calculatePearsonR(correlationData);

    const inputData = {
      biometric_data: {
        weight_lbs: goals.weightLbs,
        historical_runs: history.map(r => ({
          date: r.date,
          distance: r.distanceMi,
          pace: r.paceMinMi,
          power: r.avgPowerWatts,
          ascent: r.totalAscentFt
        }))
      },
      metabolic_load: beerHistory.map(b => ({
        date: b.date,
        abv: b.abv,
        oz: b.volumeOz,
        kcal: b.calories,
        carbs: b.carbs
      })),
      analytical_constants: {
        pearson_r: rFactor
      }
    };

    return postJson<AssessmentResponse>('/api/coach/analyze', { inputData });
  }

  async generatePerformanceSpeech(distance: number, pace: string, time: string): Promise<string> {
    const { audio } = await postJson<{ audio: string }>('/api/coach/speech', { distance, pace, time });
    if (!audio) throw new Error("Audio generation failed");
    return audio;
  }
}
