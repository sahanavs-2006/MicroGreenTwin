import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import {
  FSMState,
  SensorData,
  ActuatorState,
  SystemConfig,
  FaultInjection,
  FSMTransition,
  SystemState,
  CROP_PROFILES,
  CropProfile,
  DEFAULT_CONFIG,
  DEFAULT_SENSOR_DATA,
} from '@/types/agriculture';
import { PIDLiteController } from '@/lib/PIDLiteController';
import { TwinValidator } from '@/lib/TwinValidator';
import { getCropControlParameters, detectGrowthStage } from '@/lib/AdvancedCropProfiles';

import { TwinPrediction } from '@/types/agriculture';

const MAX_HISTORY = 20;

export function useFSMEngine(
  customProfiles: Record<string, CropProfile> = {},
  predictionRef?: RefObject<TwinPrediction | undefined>
) {
  const [fsmState, setFsmState] = useState<FSMState>('IDLE');
  const [sensorData, setSensorData] = useState<SensorData>(() => ({
    ...DEFAULT_SENSOR_DATA,
    soilMoisture: 50 + Math.random() * 10,
    temperature: 20 + Math.random() * 5,
    timestamp: Date.now(),
  }));
  const [actuatorState, setActuatorState] = useState<ActuatorState>(() => {
    let saved = null;
    try {
      saved = localStorage.getItem('mgt_last_toggle');
    } catch (e) {
      console.warn('LocalStorage blocked:', e);
    }
    return {
      irrigationLED: false,
      lastToggleTime: saved ? parseInt(saved) : Date.now(),
    };
  });
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [faultInjection, setFaultInjection] = useState<FaultInjection>({
    sensorFailure: false,
    waterTankEmpty: false,
    pumpFailure: false,
    communicationLoss: false,
  });
  const [transitionHistory, setTransitionHistory] = useState<FSMTransition[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [cycleCount, setCycleCount] = useState(0);

  // Advanced control state
  const [validationMetrics, setValidationMetrics] = useState({
    rmse: null as number | null,
    confidence: 0.5,
    controlMode: 'REACTIVE' as 'PREDICTIVE' | 'HYBRID' | 'REACTIVE',
  });
  const [lastTransition, setLastTransition] = useState<FSMTransition | null>(null);
  const [manualWaterLevel, setManualWaterLevelState] = useState<number | null>(null);
  const [manualMoisture, setManualMoistureState] = useState<number | null>(null);

  const setManualWaterLevel = useCallback((val: number | null) => {
    setManualWaterLevelState(val);
    if (val !== null) {
      setSensorData(prev => ({ ...prev, waterLevel: val, timestamp: Date.now() }));
    }
  }, []);

  const setManualMoisture = useCallback((val: number | null) => {
    setManualMoistureState(val);
    if (val !== null) {
      setSensorData(prev => ({ ...prev, soilMoisture: val, timestamp: Date.now() }));
    }
  }, []);
  const [pumpDurationScheduled, setPumpDurationScheduled] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stabilizeCounterRef = useRef(0);
  const lastRealUpdateRef = useRef<number>(0);

  // Advanced control instances
  const pidControllerRef = useRef<PIDLiteController | null>(null);
  const twinValidatorRef = useRef<TwinValidator | null>(null);
  const prevPredictionMoistureRef = useRef<number | null>(null);
  const pumpPulseCounterRef = useRef(0);
  const isControllerInitialized = useRef(false);

  // Transition to new state with logging
  const transitionTo = useCallback((newState: FSMState, trigger: string) => {
    setFsmState((prevState) => {
      if (prevState !== newState) {
        const transition: FSMTransition = {
          from: prevState,
          to: newState,
          trigger,
          timestamp: Date.now(),
        };
        setTransitionHistory((prev) => [...prev.slice(-MAX_HISTORY + 1), transition]);
      }
      return newState;
    });
  }, []);

  // Toggle actuator
  const setActuator = useCallback((on: boolean) => {
    const now = Date.now();
    try {
      localStorage.setItem('mgt_last_toggle', now.toString());
    } catch (e) {
      // Ignore storage errors
    }
    setActuatorState({
      irrigationLED: on,
      lastToggleTime: now,
    });
  }, []);

  // Initialize advanced control modules
  useEffect(() => {
    if (!pidControllerRef.current) {
      pidControllerRef.current = new PIDLiteController({
        Kp_nominal: 1.0,
        pulse_min: 3,
        pulse_max: 30,
        cooldown_period: 60,
        activation_threshold: 5,
        hysteresis_band: 2,
      });
    }

    if (!twinValidatorRef.current) {
      twinValidatorRef.current = new TwinValidator(20, {
        predictive: 0.85,
        hybrid: 0.60,
      });
    }
  }, []);

  // Simulate sensor data with physics-based model
  const simulateSensorData = useCallback(() => {
    // Skip simulation if communication loss is active (completely frozen)
    if (faultInjection.communicationLoss) {
      return;
    }

    // Skip simulation if real hardware data was received recently (within 3 seconds)
    if (Date.now() - lastRealUpdateRef.current < 3000) {
      return;
    }

    setSensorData((prev) => {
      const now = Date.now();

      // 1. Sensor Failure Priority - stops all data
      if (faultInjection.sensorFailure) {
        return {
          soilMoisture: -1,
          temperature: -99,
          humidity: -1,
          waterLevel: -1,
          timestamp: now,
        };
      }

      const hour = new Date().getHours();
      const isDaytime = hour >= 6 && hour < 18;

      // 2. Physics Simulation (always runs unless sensors fail)

      // Temperature varies naturally (NOT controlled)
      let newTemp = prev.temperature;
      if (isDaytime) {
        newTemp += 0.05 + (Math.random() - 0.5) * 0.1;
      } else {
        newTemp -= 0.05 + (Math.random() - 0.5) * 0.1;
      }
      newTemp = Math.max(15, Math.min(30, newTemp));

      // Humidity varies randomly (NOT controlled)
      let newHumidity = prev.humidity + (Math.random() - 0.5) * 1;
      newHumidity = Math.max(30, Math.min(80, newHumidity));

      // Water level decreases with pump usage
      let newWaterLevel = prev.waterLevel;
      if (actuatorState.irrigationLED && !faultInjection.pumpFailure) {
        newWaterLevel -= 0.5;
      }

      // Apply Water Tank Empty Fault
      if (faultInjection.waterTankEmpty) {
        newWaterLevel = Math.max(0, newWaterLevel - 5);
      } else {
        newWaterLevel = Math.max(0, Math.min(100, newWaterLevel));
      }

      // Tray moisture (CONTROLLED by pump)
      let newMoisture = prev.soilMoisture;

      // Evaporation based on time of day
      const evaporationRate = isDaytime ? 0.15 : 0.08;
      newMoisture -= evaporationRate;

      // Pump adds moisture
      if (actuatorState.irrigationLED && !faultInjection.pumpFailure) {
        newMoisture += 2.0;
      }
      newMoisture = Math.max(0, Math.min(100, newMoisture));

      return {
        soilMoisture: Math.round(newMoisture * 10) / 10,
        temperature: Math.round(newTemp * 10) / 10,
        humidity: Math.round(newHumidity * 10) / 10,
        waterLevel: Math.round(newWaterLevel * 10) / 10,
        timestamp: now,
      };
    });
  }, [actuatorState.irrigationLED, faultInjection]);

  // Main FSM processing logic
  const processState = useCallback(() => {
    // 1. HIGHEST PRIORITY: Communication Loss
    if (fsmState === 'COMMUNICATION_FAULT') {
      if (!faultInjection.communicationLoss) {
        transitionTo('IDLE', 'Communication restored');
      } else {
        return; // Logic frozen
      }
    } else {
      if (faultInjection.communicationLoss) {
        transitionTo('COMMUNICATION_FAULT', 'Fault injected: Communication loss');
        return;
      }
    }

    // Increment cycle count
    setCycleCount((c) => c + 1);

    // 2. PRIORITY: Sensor Failure (bidirectional: entry & recovery)
    if (fsmState === 'SENSOR_FAILURE') {
      if (!faultInjection.sensorFailure) {
        transitionTo('IDLE', 'Sensor failure cleared');
      } else {
        setActuator(false);
        simulateSensorData();
        return;
      }
    } else {
      if (faultInjection.sensorFailure) {
        transitionTo('SENSOR_FAILURE', 'Fault injected: Sensor readings invalid');
        setActuator(false);
        simulateSensorData();
        return;
      }
    }

    // 3. Update Twin Validation (RMSE)
    if (twinValidatorRef.current && prevPredictionMoistureRef.current !== null) {
      twinValidatorRef.current.update(
        prevPredictionMoistureRef.current,
        sensorData.soilMoisture
      );

      const metrics = twinValidatorRef.current.getMetrics();
      setValidationMetrics({
        rmse: metrics.rmse,
        confidence: metrics.confidence,
        controlMode: metrics.controlMode,
      });
    }

    // 4. Get advanced crop parameters and growth stage
    const growthStage = detectGrowthStage(config.daysSincePlanting, config.selectedCrop);
    const cropParams = getCropControlParameters(
      config.selectedCrop,
      growthStage,
      sensorData.temperature,
      sensorData.humidity
    );

    // 5. Sensor simulation is now handled by dedicated heartbeat effect
    // simulateSensorData() called elsewhere

    // 6. Store prediction for next cycle (Digital Twin logic)
    // Here we use a simple linear model for the immediate next cycle
    // to validate the twin's accuracy.
    const isDaytime = new Date().getHours() >= 6 && new Date().getHours() < 18;
    const evaporationBase = cropParams.k_evap;
    const envFactor = (1 + 0.03 * (sensorData.temperature - 22)) * (1 - 0.02 * (sensorData.humidity - 50) / 100);
    const expectedLoss = evaporationBase * envFactor * (config.readInterval / 1000) * 10; // scaled for simulation speed
    prevPredictionMoistureRef.current = sensorData.soilMoisture - expectedLoss;

    // 7. Check for low water fault (bidirectional: entry & recovery)
    if (fsmState === 'LOW_WATER_FAULT') {
      if (sensorData.waterLevel > config.waterLevelMinimum + 10) {
        transitionTo('IDLE', 'Water level restored');
      } else {
        setActuator(false);
        return;
      }
    } else {
      if (sensorData.waterLevel < config.waterLevelMinimum) {
        transitionTo('LOW_WATER_FAULT', 'Water level critically low');
        setActuator(false);
        return;
      }
    }

    // 8. PUMP FAILURE CHECK (bidirectional)
    if (fsmState === 'PUMP_FAILURE') {
      if (!faultInjection.pumpFailure) {
        transitionTo('IDLE', 'Pump fault cleared');
      } else {
        setActuator(false);
        return;
      }
    } else {
      // If we are watering OR about to water and pump failure is active
      if (faultInjection.pumpFailure && fsmState === 'WATER_TRAY') {
        transitionTo('PUMP_FAILURE', 'Pump failure detected during operation');
        setActuator(false);
        return;
      }
    }

    switch (fsmState) {
      case 'INIT':
        transitionTo('READ_ENVIRONMENT', 'System initialized - starting first read cycle');
        break;

      case 'IDLE':
        transitionTo('READ_ENVIRONMENT', 'Starting sensor read cycle');
        break;

      case 'READ_ENVIRONMENT':
        transitionTo('ANALYZE_CLIMATE', 'Sensor data acquired');
        break;

      case 'ANALYZE_CLIMATE': {
        const moistureError = cropParams.setpoint - sensorData.soilMoisture;
        const activationThreshold = cropParams.pidParams.activation_threshold;

        // Decide control mode: Predictive (if confidence high and prop prediction exists)
        // or Reactive (default)
        let mode = config.controlMode;
        if (mode === 'HYBRID') {
          mode = validationMetrics.confidence > 0.7 ? 'PREDICTIVE' : 'REACTIVE';
        }

        let shouldWater = false;
        let triggerMsg = '';

        const prediction = predictionRef?.current;

        if (mode === 'PREDICTIVE' && prediction) {
          // Look ahead 4 hours in the forecast
          const willBeLow = prediction.predictedTrayMoisture.slice(0, 4).some(m => m < cropParams.setpoint - 2);
          if (willBeLow) {
            shouldWater = true;
            triggerMsg = 'Predictive: Moisture deficit forecasted in next 4h';
          }
        }

        // Fallback to reactive/PID logic if not already watering
        if (!shouldWater && moistureError > activationThreshold) {
          shouldWater = true;
          triggerMsg = `Reactive: Moisture ${sensorData.soilMoisture}% below setpoint ${cropParams.setpoint}%`;
        }

        // Check for pump failure BEFORE deciding to water
        if (faultInjection.pumpFailure) {
          shouldWater = false;
          // We don't need to transition here because the global check at #8 will catch it
          // but we must prevent 'WATER_TRAY' transition in this block.
        }

        if (shouldWater) {
          if (sensorData.waterLevel > config.waterLevelMinimum) {
            // Compute PID-Lite pump duration
            if (pidControllerRef.current) {
              // Update controller params with current crop settings
              pidControllerRef.current.updateParams(cropParams.pidParams);

              const duration = pidControllerRef.current.computeControl(
                cropParams.setpoint,
                sensorData.soilMoisture,
                {
                  temperature: sensorData.temperature,
                  humidity: sensorData.humidity,
                  k_evap_base: cropParams.k_evap
                }
              );

              if (duration > 0 || config.controlMode === 'REACTIVE') {
                const finalDuration = duration || 5;
                setPumpDurationScheduled(finalDuration);
                pumpPulseCounterRef.current = finalDuration;
                transitionTo('WATER_TRAY', triggerMsg);
              } else {
                transitionTo('SAFE_MONITOR', 'Moisture stable (cool-down)');
              }
            } else {
              setPumpDurationScheduled(5);
              pumpPulseCounterRef.current = 5;
              transitionTo('WATER_TRAY', triggerMsg);
            }
          } else {
            transitionTo('LOW_WATER_FAULT', 'Insufficient water for irrigation');
          }
        } else {
          transitionTo('SAFE_MONITOR', 'Climate within acceptable range');
        }
        break;
      }

      case 'WATER_TRAY':
        if (!faultInjection.pumpFailure) {
          setActuator(true);
        }

        // Decrement pulse counter based on actual elapsed time (readInterval)
        pumpPulseCounterRef.current -= (config.readInterval / 1000);

        // Check if pulse is complete OR moisture setpoint reached (safety override)
        if (pumpPulseCounterRef.current <= 0 || sensorData.soilMoisture >= cropParams.setpoint + 5) {
          setActuator(false);
          if (pidControllerRef.current) {
            pidControllerRef.current.reset();
          }
          transitionTo('STABILIZE_ENV', 'Irrigation complete');
          stabilizeCounterRef.current = 0;
          pumpPulseCounterRef.current = 0;
        }
        break;

      case 'STABILIZE_ENV':
        setActuator(false);
        // Use time-based stabilization instead of cycle-based
        if (stabilizeCounterRef.current === 0) {
          stabilizeCounterRef.current = Date.now();
        }

        const elapsedSec = (Date.now() - stabilizeCounterRef.current) / 1000;
        if (elapsedSec >= config.stabilizationTime) {
          transitionTo('SAFE_MONITOR', 'Environment stabilized');
          stabilizeCounterRef.current = 0;
        }
        break;

      case 'SAFE_MONITOR':
        // PID-Lite logic: if moisture drops below threshold - hysteresis
        if (sensorData.soilMoisture < cropParams.setpoint - cropParams.pidParams.hysteresis_band) {
          transitionTo('READ_ENVIRONMENT', 'Moisture dropped below threshold');
        }
        break;

      case 'SAFE_STOP':
        setActuator(false);
        break;
    }
  }, [fsmState, sensorData, config, customProfiles, faultInjection, simulateSensorData, transitionTo, setActuator, predictionRef, validationMetrics.confidence]);

  // Start system
  const start = useCallback(() => {
    setIsRunning(true);

    // Check for active faults immediately on start
    if (faultInjection.sensorFailure) {
      transitionTo('SENSOR_FAILURE', 'System started with sensor failure active');
    } else if (faultInjection.communicationLoss) {
      // Don't transition, just freeze (communication loss blocks everything)
      transitionTo('INIT', 'System start requested (communication frozen)');
    } else {
      transitionTo('INIT', 'System start requested');
    }
  }, [transitionTo, faultInjection]);

  // Stop system
  const stop = useCallback(() => {
    setIsRunning(false);
    transitionTo('SAFE_STOP', 'Manual stop requested');
    setActuator(false);
  }, [transitionTo, setActuator]);

  // Reset system
  const reset = useCallback(() => {
    setIsRunning(false);
    setFsmState('IDLE');
    setSensorData(DEFAULT_SENSOR_DATA);
    setActuatorState({ irrigationLED: false, lastToggleTime: Date.now() });
    setTransitionHistory([]);
    setCycleCount(0);
    stabilizeCounterRef.current = 0;
    setFaultInjection({
      sensorFailure: false,
      waterTankEmpty: false,
      pumpFailure: false,
      communicationLoss: false,
    });
    if (pidControllerRef.current) {
      pidControllerRef.current.reset(true);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<SystemConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  }, []);

  // Inject fault
  const injectFault = useCallback((type: keyof FaultInjection, active: boolean) => {
    setFaultInjection((prev) => ({ ...prev, [type]: active }));
  }, []);

  // Feed real sensor data (for hardware integration)
  const feedRealData = useCallback((data: Partial<SensorData>) => {
    if (!faultInjection.communicationLoss) {
      lastRealUpdateRef.current = Date.now();
      setSensorData((prev) => ({ ...prev, ...data, timestamp: Date.now() }));
    }
  }, [faultInjection.communicationLoss]);

  // Main loop effect using a ref to the latest processState
  const processStateRef = useRef(processState);
  useEffect(() => {
    processStateRef.current = processState;
  }, [processState]);

  // FSM Engine Interval (Control Logic)
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        processStateRef.current();
      }, config.readInterval);
      intervalRef.current = interval;
      return () => clearInterval(interval);
    }
  }, [isRunning, config.readInterval]);

  // Real-time Sensor Simulation Interval (Runs always for dashboard responsiveness)
  useEffect(() => {
    const simInterval = setInterval(() => {
      // 1. Skip if hardware data is active
      if (Date.now() - lastRealUpdateRef.current < 2000) return;

      // 2. Skip if communication failure fault is active
      if (faultInjection.communicationLoss) return;

      setSensorData((prev) => {
        const now = Date.now();

        // Sensor Failure Case
        if (faultInjection.sensorFailure) {
          return { ...prev, soilMoisture: -1, temperature: -99, humidity: -1, waterLevel: -1, timestamp: now };
        }

        const hour = new Date().getHours();
        const isDaytime = hour >= 6 && hour < 18;

        // Temperature & Humidity drift
        let newTemp = prev.temperature + (isDaytime ? 0.02 : -0.02) + (Math.random() - 0.5) * 0.1;
        newTemp = Math.max(15, Math.min(30, newTemp));

        let newHumidity = prev.humidity + (Math.random() - 0.5) * 0.5;
        newHumidity = Math.max(30, Math.min(80, newHumidity));

        // Water level logic
        let newWaterLevel = prev.waterLevel;

        // Drain if pumping
        if (actuatorState.irrigationLED && !faultInjection.pumpFailure) {
          newWaterLevel -= 0.8;
        }

        // Fast drain if fault active
        if (faultInjection.waterTankEmpty) {
          newWaterLevel -= 5.0;
        }

        // Automatic slow refill simulation (if not a fault) to keep dashboard "alive"
        if (!faultInjection.waterTankEmpty && newWaterLevel < 100) {
          newWaterLevel += 0.05;
        }

        newWaterLevel = Math.max(0, Math.min(100, newWaterLevel));

        // Moisture logic
        let newMoisture = prev.soilMoisture;
        const evaporationRate = isDaytime ? 0.1 : 0.05;
        newMoisture -= evaporationRate;

        if (actuatorState.irrigationLED && !faultInjection.pumpFailure) {
          newMoisture += 1.5;
        }
        newMoisture = Math.max(0, Math.min(100, newMoisture));

        return {
          soilMoisture: manualMoisture !== null ? manualMoisture : Math.round(newMoisture * 10) / 10,
          temperature: Math.round(newTemp * 10) / 10,
          humidity: Math.round(newHumidity * 10) / 10,
          waterLevel: manualWaterLevel !== null ? manualWaterLevel : Math.round(newWaterLevel * 10) / 10,
          timestamp: now,
        };
      });
    }, 1000); // Always 1 second sensor heartbeat

    return () => clearInterval(simInterval);
  }, [actuatorState.irrigationLED, faultInjection, manualWaterLevel, manualMoisture]);

  // Handle hardware sensor data
  const handleHardwareData = useCallback((data: Partial<SensorData>) => {
    lastRealUpdateRef.current = Date.now();
    setSensorData(prev => {
      // Priority: Manual Override > Incoming Hardware Data > Previous State
      const waterLevel = manualWaterLevel !== null
        ? manualWaterLevel
        : (data.waterLevel !== undefined ? data.waterLevel : prev.waterLevel);

      const soilMoisture = manualMoisture !== null
        ? manualMoisture
        : (data.soilMoisture !== undefined ? data.soilMoisture : prev.soilMoisture);

      return {
        ...prev,
        ...data,
        waterLevel,
        soilMoisture,
        timestamp: Date.now()
      };
    });
  }, [manualWaterLevel, manualMoisture]);

  const systemState: SystemState = {
    fsmState,
    sensorData,
    actuatorState,
    config,
    faultInjection,
    transitionHistory,
    isRunning,
    cycleCount,
    validationMetrics,
    pumpDurationScheduled,
    manualWaterLevel,
    manualMoisture,
    setManualWaterLevel,
    setManualMoisture,
  };

  return {
    ...systemState,
    start,
    stop,
    reset,
    updateConfig,
    injectFault,
    handleHardwareData,
    // Advanced control exports
    validationMetrics,
    pumpDurationScheduled,
  };
}
