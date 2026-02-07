import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SensorData,
  TwinPrediction,
  TwinSyncStatus,
  CropType,
  CROP_PROFILES,
  CropProfile,
} from '@/types/agriculture';

export function useDigitalTwin(
  sensorData: SensorData,
  selectedCrop: CropType,
  isRunning: boolean,
  customProfiles: Record<string, CropProfile> = {}
) {
  const [prediction, setPrediction] = useState<TwinPrediction>(() =>
    generateInitialPrediction(sensorData, selectedCrop, customProfiles)
  );
  const [syncStatus, setSyncStatus] = useState<TwinSyncStatus>('OFFLINE');
  const [lastRealMoisture, setLastRealMoisture] = useState(sensorData.soilMoisture);
  const calibrationFactorRef = useRef(1.0);

  // Generate predictions based on current data
  const generatePredictions = useCallback(() => {
    const normalizedCrop = selectedCrop.charAt(0).toUpperCase() + selectedCrop.slice(1).toLowerCase();
    const profile = (CROP_PROFILES as any)[normalizedCrop] || customProfiles[selectedCrop];
    if (!profile) return;

    const currentHour = new Date().getHours();

    // Arrays for 24-hour predictions
    const predictedMoisture: number[] = [];
    const predictedTemp: number[] = [];
    const predictedHumidity: number[] = [];

    let moisture = sensorData.soilMoisture;
    let temp = sensorData.temperature;
    let humidity = sensorData.humidity;

    for (let hour = 0; hour < 24; hour++) {
      const futureHour = (currentHour + hour) % 24;
      const isDaytime = futureHour >= 6 && futureHour < 18;

      // Moisture decay (evapotranspiration model)
      const dayFactor = isDaytime ? 1.5 : 0.5;
      const tempFactor = 1 + (temp - 20) * 0.02;
      const moistureLoss = 0.8 * dayFactor * tempFactor * calibrationFactorRef.current;
      moisture = Math.max(0, moisture - moistureLoss); // Removed random noise for stable forecast

      // Temperature prediction
      if (isDaytime) {
        temp += 0.3;
      } else {
        temp -= 0.25;
      }
      temp = Math.max(15, Math.min(32, temp));

      // Humidity prediction (inverse relationship with temp)
      humidity += (22 - temp) * 0.1;
      humidity = Math.max(30, Math.min(80, humidity));

      predictedMoisture.push(Math.round(moisture * 10) / 10);
      predictedTemp.push(Math.round(temp * 10) / 10);
      predictedHumidity.push(Math.round(humidity * 10) / 10);
    }

    // Calculate stability index (informational only)
    const stabilityIndex = calculateStabilityIndex(sensorData, profile);

    // Calculate when irrigation will be needed
    const irrigationHour = predictedMoisture.findIndex(m => m < profile.trayMoistureMin);
    const predictedIrrigationTime = irrigationHour === -1 ? null : irrigationHour;

    // Determine risk level
    const irrigationRiskLevel = calculateRiskLevel(
      sensorData.soilMoisture,
      sensorData.waterLevel,
      profile.trayMoistureMin,
      predictedIrrigationTime
    );

    // Generate recommendations
    const recommendations = generateRecommendations(
      sensorData,
      profile,
      predictedIrrigationTime,
      irrigationRiskLevel,
      stabilityIndex
    );

    // Calculate model accuracy based on prediction vs reality
    const predictionError = Math.abs(lastRealMoisture - sensorData.soilMoisture);
    const modelAccuracy = Math.max(0, 100 - predictionError * 5);

    setPrediction({
      predictedTrayMoisture: predictedMoisture,
      predictedTemp,
      predictedHumidity,
      stabilityIndex,
      modelAccuracy,
      calibrationFactor: calibrationFactorRef.current,
      safeZone: {
        temp: [profile.tempMin, profile.tempMax],
        humidity: [profile.humidityMin, profile.humidityMax],
        moisture: [profile.trayMoistureMin, profile.trayMoistureMax],
      },
      predictedIrrigationTime,
      irrigationRiskLevel,
      recommendations,
    });

    // Update sync status based on accuracy
    if (modelAccuracy > 90) {
      setSyncStatus('SYNCHRONIZED');
    } else if (modelAccuracy > 70) {
      setSyncStatus('CALIBRATING');
    } else {
      setSyncStatus('DRIFTING');
    }

    // Adaptive self-correction
    if (sensorData.soilMoisture < lastRealMoisture - 1) {
      // Drying faster than expected
      calibrationFactorRef.current = Math.min(1.5, calibrationFactorRef.current + 0.01);
    } else if (sensorData.soilMoisture > lastRealMoisture + 1) {
      // Wetter than expected
      calibrationFactorRef.current = Math.max(0.5, calibrationFactorRef.current - 0.01);
    }

    setLastRealMoisture(sensorData.soilMoisture);
  }, [sensorData, selectedCrop, lastRealMoisture, customProfiles]);

  // Update predictions periodically when running
  useEffect(() => {
    if (!isRunning) {
      setSyncStatus('OFFLINE');
      return;
    }

    generatePredictions();
    const interval = setInterval(generatePredictions, 3000);

    return () => clearInterval(interval);
  }, [isRunning, generatePredictions]);

  // Regenerate when crop changes
  useEffect(() => {
    if (isRunning) {
      generatePredictions();
    }
  }, [selectedCrop, isRunning, generatePredictions]);

  return {
    prediction,
    syncStatus,
    regeneratePredictions: generatePredictions,
  };
}

// Helper Functions

function generateInitialPrediction(
  sensorData: SensorData,
  crop: CropType,
  customProfiles: Record<string, CropProfile>
): TwinPrediction {
  const normalizedCrop = crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase();
  const profile = (CROP_PROFILES as any)[normalizedCrop] || customProfiles[crop] || CROP_PROFILES.Mustard;
  return {
    predictedTrayMoisture: Array(24).fill(sensorData.soilMoisture),
    predictedTemp: Array(24).fill(sensorData.temperature),
    predictedHumidity: Array(24).fill(sensorData.humidity),
    stabilityIndex: 75,
    modelAccuracy: 85,
    calibrationFactor: 1.0,
    safeZone: {
      temp: [profile.tempMin, profile.tempMax],
      humidity: [profile.humidityMin, profile.humidityMax],
      moisture: [profile.trayMoistureMin, profile.trayMoistureMax],
    },
    predictedIrrigationTime: null,
    irrigationRiskLevel: 'low',
    recommendations: ['System ready - start monitoring to generate predictions'],
  };
}

function calculateStabilityIndex(
  sensor: SensorData,
  profile: { tempMin: number; tempMax: number; humidityMin: number; humidityMax: number; trayMoistureMin: number; trayMoistureMax: number }
): number {
  let score = 100;

  // Temperature check
  if (sensor.temperature < profile.tempMin || sensor.temperature > profile.tempMax) {
    score -= 20;
  }

  // Humidity check
  if (sensor.humidity < profile.humidityMin || sensor.humidity > profile.humidityMax) {
    score -= 20;
  }

  // Moisture check (more weight since it's the controlled variable)
  if (sensor.soilMoisture < profile.trayMoistureMin - 5) {
    score -= 30; // Critical dry
  } else if (sensor.soilMoisture < profile.trayMoistureMin) {
    score -= 15; // Below optimal
  } else if (sensor.soilMoisture > profile.trayMoistureMax + 10) {
    score -= 10; // Too wet
  }

  return Math.max(0, Math.min(100, score));
}

function calculateRiskLevel(
  moisture: number,
  waterLevel: number,
  minMoisture: number,
  hoursUntilWatering: number | null
): 'low' | 'medium' | 'high' {
  if (waterLevel < 20) return 'high';
  if (moisture < minMoisture) return 'high';
  if (hoursUntilWatering !== null && hoursUntilWatering < 3) return 'medium';
  if (moisture < minMoisture + 10) return 'medium';
  return 'low';
}

function generateRecommendations(
  sensor: SensorData,
  profile: { tempMin: number; tempMax: number; humidityMin: number; humidityMax: number; trayMoistureMin: number; trayMoistureMax: number },
  irrigationTime: number | null,
  riskLevel: string,
  stability: number
): string[] {
  const recs: string[] = [];

  // Water level recommendations
  if (sensor.waterLevel < 30) {
    recs.push('⚠️ Refill water tank soon - level below 30%');
  } else if (sensor.waterLevel < 50) {
    recs.push('💧 Consider refilling water tank');
  }

  // Moisture recommendations
  if (sensor.soilMoisture < profile.trayMoistureMin) {
    recs.push('🚿 Immediate irrigation recommended - moisture critically low');
  } else if (irrigationTime !== null && irrigationTime < 6) {
    recs.push(`⏰ Irrigation predicted in ${irrigationTime} hours`);
  }

  // Temperature observations (informational only)
  if (sensor.temperature > profile.tempMax) {
    recs.push(`🌡️ Temperature ${sensor.temperature}°C above optimal range`);
  } else if (sensor.temperature < profile.tempMin) {
    recs.push(`❄️ Temperature ${sensor.temperature}°C below optimal range`);
  }

  // Humidity observations
  if (sensor.humidity > profile.humidityMax) {
    recs.push('💨 High humidity detected - monitor for mold risk');
  } else if (sensor.humidity < profile.humidityMin) {
    recs.push('🏜️ Low humidity may increase evaporation rate');
  }

  // Stability recommendation
  if (stability < 50) {
    recs.push('⚡ Climate stability critical - check environmental conditions');
  } else if (stability < 70) {
    recs.push('📊 Climate slightly unstable - monitoring closely');
  }

  // Default good status
  if (recs.length === 0) {
    recs.push('✅ All systems optimal - microgreens thriving');
  }

  return recs.slice(0, 4); // Max 4 recommendations
}
