// MicroGreenTwin Type Definitions

// FSM States (10 total)
export type FSMState =
  | 'INIT'              // System startup
  | 'IDLE'              // Standby mode
  | 'READ_ENVIRONMENT'  // Acquiring sensor data
  | 'ANALYZE_CLIMATE'   // Checking tray moisture against crop profile
  | 'WATER_TRAY'        // Bottom watering pump active
  | 'STABILIZE_ENV'     // Waiting for environment to balance
  | 'SAFE_MONITOR'      // Moisture stable, passive monitoring
  | 'LOW_WATER_FAULT'   // Water tank empty
  | 'SENSOR_FAILURE'    // Invalid sensor readings
  | 'PUMP_FAILURE'      // Pump actuator failure
  | 'COMMUNICATION_FAULT' // System processing frozen
  | 'SAFE_STOP';        // Manual/safety stop

// Crop Types
export type CropType = 'Mustard' | 'Radish' | 'Sunflower' | 'Broccoli';

// Crop Profile Interface
export interface CropProfile {
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  trayMoistureMin: number;
  trayMoistureMax: number;
}

// Crop Profiles Constant
export const CROP_PROFILES: Record<CropType, CropProfile> = {
  Mustard: { tempMin: 18, tempMax: 24, humidityMin: 45, humidityMax: 65, trayMoistureMin: 35, trayMoistureMax: 75 },
  Radish: { tempMin: 16, tempMax: 22, humidityMin: 40, humidityMax: 60, trayMoistureMin: 30, trayMoistureMax: 70 },
  Sunflower: { tempMin: 20, tempMax: 25, humidityMin: 50, humidityMax: 60, trayMoistureMin: 45, trayMoistureMax: 80 },
  Broccoli: { tempMin: 18, tempMax: 23, humidityMin: 45, humidityMax: 65, trayMoistureMin: 35, trayMoistureMax: 70 }
};

// Sensor Data Interface
export interface SensorData {
  soilMoisture: number;  // 0-100% (tray moisture)
  temperature: number;   // Celsius (monitored, not controlled)
  humidity: number;      // 0-100% (monitored, not controlled)
  waterLevel: number;    // 0-100%
  timestamp: number;
}

// Actuator State Interface
export interface ActuatorState {
  irrigationLED: boolean;  // Pump (bottom watering) - ONLY actuator
  lastToggleTime: number;
}

// FSM Transition Event
export interface FSMTransition {
  from: FSMState;
  to: FSMState;
  trigger: string;
  timestamp: number;
}

// System Configuration
export interface SystemConfig {
  selectedCrop: CropType;
  waterLevelMinimum: number;  // Threshold for LOW_WATER_FAULT
  stabilizationTime: number;  // Seconds to wait in STABILIZE_ENV
  readInterval: number;       // Milliseconds between sensor reads
  daysSincePlanting: number;  // Used for growth stage detection
  controlMode: 'REACTIVE' | 'PREDICTIVE' | 'HYBRID';
}

// Fault Injection State
export interface FaultInjection {
  sensorFailure: boolean;
  waterTankEmpty: boolean;
  pumpFailure: boolean;
  communicationLoss: boolean;
}

// Digital Twin Prediction
export interface TwinPrediction {
  predictedTrayMoisture: number[];  // 24 values (hourly)
  predictedTemp: number[];          // 24 values (monitoring only)
  predictedHumidity: number[];      // 24 values (monitoring only)
  stabilityIndex: number;           // 0-100% (informational metric)
  modelAccuracy: number;            // 0-100% (Adaptive Twin metric)
  calibrationFactor: number;        // Multiplier (e.g. 1.05) - Self-correcting
  safeZone: {
    temp: [number, number];         // [min, max] for stability calc
    humidity: [number, number];     // [min, max] for stability calc
    moisture: [number, number];     // [min, max] for FSM decisions
  };
  predictedIrrigationTime: number | null;  // Hours until watering needed
  irrigationRiskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Twin Sync Status
export type TwinSyncStatus = 'SYNCHRONIZED' | 'DRIFTING' | 'CALIBRATING' | 'OFFLINE';

// Complete System State
export interface SystemState {
  fsmState: FSMState;
  sensorData: SensorData;
  actuatorState: ActuatorState;
  config: SystemConfig;
  faultInjection: FaultInjection;
  transitionHistory: FSMTransition[];
  isRunning: boolean;
  cycleCount: number;
  // Advanced demo/control fields
  validationMetrics?: {
    rmse: number | null;
    confidence: number;
    controlMode: 'PREDICTIVE' | 'HYBRID' | 'REACTIVE';
  };
  pumpDurationScheduled?: number;
  manualWaterLevel?: number | null;
  manualMoisture?: number | null;
  setManualWaterLevel?: (val: number | null) => void;
  setManualMoisture?: (val: number | null) => void;
}

// Default Configuration
export const DEFAULT_CONFIG: SystemConfig = {
  selectedCrop: 'Mustard',
  waterLevelMinimum: 15,
  stabilizationTime: 5,
  readInterval: 1000,
  daysSincePlanting: 1,
  controlMode: 'REACTIVE'
};

// Default Sensor Data
export const DEFAULT_SENSOR_DATA: SensorData = {
  soilMoisture: 55,
  temperature: 22,
  humidity: 55,
  waterLevel: 80,
  timestamp: Date.now()
};

// State Display Names
export const STATE_DISPLAY_NAMES: Record<FSMState, string> = {
  INIT: 'Initializing',
  IDLE: 'Idle',
  READ_ENVIRONMENT: 'Reading Sensors',
  ANALYZE_CLIMATE: 'Analyzing Climate',
  WATER_TRAY: 'Watering Tray',
  STABILIZE_ENV: 'Stabilizing',
  SAFE_MONITOR: 'Monitoring',
  LOW_WATER_FAULT: 'Low Water Fault',
  SENSOR_FAILURE: 'Sensor Failure',
  PUMP_FAILURE: 'Pump Failure',
  COMMUNICATION_FAULT: 'Communication Loss',
  SAFE_STOP: 'Stopped'
};

// State Colors
export const STATE_COLORS: Record<FSMState, string> = {
  INIT: 'state-idle',
  IDLE: 'state-idle',
  READ_ENVIRONMENT: 'state-active',
  ANALYZE_CLIMATE: 'state-active',
  WATER_TRAY: 'pump',
  STABILIZE_ENV: 'state-warning',
  SAFE_MONITOR: 'state-success',
  LOW_WATER_FAULT: 'state-error',
  SENSOR_FAILURE: 'state-error',
  PUMP_FAILURE: 'state-error',
  COMMUNICATION_FAULT: 'state-error',
  SAFE_STOP: 'state-idle'
};

// Crop Display Info
export const CROP_DISPLAY_INFO: Record<CropType, { name: string; emoji: string; days: string }> = {
  Mustard: { name: 'Mustard Greens', emoji: '🌱', days: '7-10 days' },
  Radish: { name: 'Radish Microgreens', emoji: '🌿', days: '6-8 days' },
  Sunflower: { name: 'Sunflower Shoots', emoji: '🌻', days: '10-14 days' },
  Broccoli: { name: 'Broccoli Microgreens', emoji: '🥦', days: '8-12 days' }
};
