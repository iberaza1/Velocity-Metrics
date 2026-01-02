
export interface Run {
  id: string;
  date: string;
  distanceMi: number;
  durationSec: number;
  paceMinMi: number; // minutes per mile
  avgPowerWatts: number;
  totalAscentFt: number;
  path: Coordinate[];
}

export interface Coordinate {
  lat: number;
  lng: number;
  elevation?: number; // meters
}

export interface UserGoals {
  weeklyMi: number;
  monthlyMi: number;
  weightLbs: number;
}

export interface BeerLog {
  id: string;
  date: string;
  name: string;
  type: string;
  abv: number;
  calories: number;
  carbs: number;
  volumeOz: number;
  timing: 'day_before' | 'day_of';
}

export interface AssessmentResponse {
  summary_metrics: {
    rolling_avg_pace: number;
    correlation_coefficient: number; // Pearson r
    metabolic_tax_estimate: number; // seconds per mile
    efficiency_factor: number;
    mechanical_output_avg: number; // Watts
  };
  executive_summary: {
    kinematic_update: string;
    beer_performance_matrix: string;
    action_plan: string;
  };
  status: 'Peaking' | 'Overtraining' | 'Plateau' | 'Improving' | 'Recovery';
  anomalies: string[];
}

export interface GroundingResource {
  title: string;
  uri: string;
}
