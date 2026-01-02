
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Run, BeerLog, AssessmentResponse, UserGoals } from "../types";
import { calculatePearsonR } from "../utils/conversions";

export class GeminiService {
  /**
   * VelocityMetrics Predictive Analytical Engine
   * Specializing in Sports Data Science & Metabolic Modeling
   */
  async analyzePerformance(history: Run[], beerHistory: BeerLog[], goals: UserGoals): Promise<AssessmentResponse> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    const systemInstruction = `Role: Senior Sports Data Scientist.
Objective: Analyze performance data for a high-level runner with a Physics background.

Scientific Models:
1. BANISTER IMPULSE-RESPONSE: Calculate TRIMP (Training Impulse) from distance and power.
2. WIDMARK MODEL: Analyze ethanol clearance vs. performance decay ( cardiac drift).
3. EFFICIENCY FACTOR (EF): Evaluate Pace/Watts as a measure of metabolic economy.

Output Requirements:
Return a valid JSON object with the following sections:
- THE KINEMATIC UPDATE: Summary of cumulative impulse and mechanical power output.
- THE BEER-PERFORMANCE MATRIX: Summary of how recent consumption is impacting pace variance (independent: beer, dependent: pace).
- THE ACTION PLAN: Data-backed recommendations for the next run.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Execute biophysical audit: ${JSON.stringify(inputData)}`,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 24000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary_metrics: {
              type: Type.OBJECT,
              properties: {
                rolling_avg_pace: { type: Type.NUMBER },
                correlation_coefficient: { type: Type.NUMBER },
                metabolic_tax_estimate: { type: Type.NUMBER },
                efficiency_factor: { type: Type.NUMBER },
                mechanical_output_avg: { type: Type.NUMBER }
              },
              required: ["rolling_avg_pace", "correlation_coefficient", "metabolic_tax_estimate", "efficiency_factor", "mechanical_output_avg"]
            },
            executive_summary: {
              type: Type.OBJECT,
              properties: {
                kinematic_update: { type: Type.STRING },
                beer_performance_matrix: { type: Type.STRING },
                action_plan: { type: Type.STRING }
              },
              required: ["kinematic_update", "beer_performance_matrix", "action_plan"]
            },
            status: { 
              type: Type.STRING, 
              enum: ['Peaking', 'Overtraining', 'Plateau', 'Improving', 'Recovery']
            },
            anomalies: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary_metrics", "executive_summary", "status", "anomalies"]
        }
      }
    });

    return JSON.parse(response.text);
  }

  async generatePerformanceSpeech(distance: number, pace: string, time: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Report: ${distance.toFixed(2)} miles. Pace: ${pace}. Time: ${time}. Professional tone.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
  }
}
