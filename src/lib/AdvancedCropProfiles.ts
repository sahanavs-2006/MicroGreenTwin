/**
 * Advanced Crop Profile System
 * 
 * Biological parameter models for different microgreens
 * Enables crop-specific adaptive control
 */

import { CropProfile } from '@/types/agriculture';
import { PIDLiteParams } from './PIDLiteController';

export type GrowthStage = 'seedling' | 'vegetative' | 'mature';

export interface StageModifiers {
    Kp_multiplier: number;      // Gain adjustment for this stage
    moisture_offset: number;    // Setpoint offset (%)
    evap_multiplier: number;    // Evaporation rate adjustment
}

export interface AdvancedCropProfile extends CropProfile {
    name: string;
    // Biological Parameters
    evaporationConstant_base: number;  // hr^-1 (crop-specific)
    rootDepthFactor: number;           // [0.5-1.5] uptake efficiency
    stressTolerance: number;           // [0-1] (0=sensitive, 1=hardy)

    // PID-Lite Control Parameters
    pidParams: PIDLiteParams;

    // Growth Stage Modifiers
    stageModifiers: Record<GrowthStage, StageModifiers>;

    // Metadata
    scientificName: string;
    optimalGrowthDays: number;
    description: string;
    waterLevelMinimum: number;
}

/**
 * Crop Profile Database
 * 
 * Based on agricultural research and empirical tuning
 */
export const ADVANCED_CROP_PROFILES: Record<string, AdvancedCropProfile> = {
    'radish': {
        // Base Profile
        name: 'Radish Microgreens',
        scientificName: 'Raphanus sativus',
        description: 'Fast-growing, high water demand, sensitive to drought stress',
        optimalGrowthDays: 7,

        // Moisture Thresholds
        trayMoistureMin: 45,
        trayMoistureMax: 75,
        tempMin: 18,
        tempMax: 24,
        humidityMin: 50,
        humidityMax: 70,
        waterLevelMinimum: 20,

        // Biological Parameters
        evaporationConstant_base: 0.0015,  // Fast evapotranspiration
        rootDepthFactor: 0.8,               // Shallow roots (80% efficiency)
        stressTolerance: 0.3,               // Very sensitive to stress

        // PID-Lite Parameters
        pidParams: {
            Kp_nominal: 1.2,          // Aggressive control
            pulse_min: 3,
            pulse_max: 25,
            cooldown_period: 90,      // Shorter cooldown (frequent watering)
            activation_threshold: 5,
            hysteresis_band: 2
        },

        // Growth Stage Behavior
        stageModifiers: {
            seedling: {
                Kp_multiplier: 0.7,     // Gentle (fragile seedlings)
                moisture_offset: 5,     // Keep wetter (+5%)
                evap_multiplier: 0.8    // Lower evaporation
            },
            vegetative: {
                Kp_multiplier: 1.0,     // Normal
                moisture_offset: 0,
                evap_multiplier: 1.0
            },
            mature: {
                Kp_multiplier: 0.9,     // Slightly gentler (prevent overwatering before harvest)
                moisture_offset: -3,    // Can tolerate drier (-3%)
                evap_multiplier: 1.1    // Higher evaporation
            }
        }
    },

    'basil': {
        name: 'Basil Microgreens',
        scientificName: 'Ocimum basilicum',
        description: 'Slow-growing, deep roots, hardy and stress-tolerant',
        optimalGrowthDays: 12,

        trayMoistureMin: 35,
        trayMoistureMax: 65,
        tempMin: 20,
        tempMax: 28,
        humidityMin: 40,
        humidityMax: 65,
        waterLevelMinimum: 20,

        evaporationConstant_base: 0.0008,  // Slow evapotranspiration (deep roots)
        rootDepthFactor: 1.3,               // Deep roots (130% efficiency)
        stressTolerance: 0.8,               // Very hardy

        pidParams: {
            Kp_nominal: 0.8,          // Gentle control
            pulse_min: 4,
            pulse_max: 20,
            cooldown_period: 120,     // Longer cooldown (infrequent watering)
            activation_threshold: 6,
            hysteresis_band: 3
        },

        stageModifiers: {
            seedling: {
                Kp_multiplier: 0.6,
                moisture_offset: 8,     // Keep very wet for germination
                evap_multiplier: 0.7
            },
            vegetative: {
                Kp_multiplier: 1.0,
                moisture_offset: 0,
                evap_multiplier: 1.0
            },
            mature: {
                Kp_multiplier: 1.1,
                moisture_offset: -5,    // Can go quite dry
                evap_multiplier: 1.2
            }
        }
    },

    'mustard': {
        name: 'Mustard Greens',
        scientificName: 'Brassica juncea',
        description: 'Medium growth rate, balanced water needs, moderately hardy',
        optimalGrowthDays: 10,

        trayMoistureMin: 40,
        trayMoistureMax: 70,
        tempMin: 18,
        tempMax: 26,
        humidityMin: 45,
        humidityMax: 65,
        waterLevelMinimum: 20,

        evaporationConstant_base: 0.001,   // Medium evapotranspiration
        rootDepthFactor: 1.0,               // Medium depth (100% baseline)
        stressTolerance: 0.6,               // Moderately hardy

        pidParams: {
            Kp_nominal: 1.0,          // Balanced control
            pulse_min: 3,
            pulse_max: 22,
            cooldown_period: 100,
            activation_threshold: 5,
            hysteresis_band: 2
        },

        stageModifiers: {
            seedling: {
                Kp_multiplier: 0.7,
                moisture_offset: 5,
                evap_multiplier: 0.8
            },
            vegetative: {
                Kp_multiplier: 1.0,
                moisture_offset: 0,
                evap_multiplier: 1.0
            },
            mature: {
                Kp_multiplier: 1.0,
                moisture_offset: -2,
                evap_multiplier: 1.1
            }
        }
    },

    'pea-shoots': {
        name: 'Pea Shoots',
        scientificName: 'Pisum sativum',
        description: 'Fast-growing, high water demand, medium stress tolerance',
        optimalGrowthDays: 9,

        trayMoistureMin: 50,
        trayMoistureMax: 80,
        tempMin: 16,
        tempMax: 22,
        humidityMin: 50,
        humidityMax: 70,
        waterLevelMinimum: 20,

        evaporationConstant_base: 0.0012,
        rootDepthFactor: 0.9,
        stressTolerance: 0.5,

        pidParams: {
            Kp_nominal: 1.1,
            pulse_min: 4,
            pulse_max: 28,
            cooldown_period: 95,
            activation_threshold: 5,
            hysteresis_band: 2
        },

        stageModifiers: {
            seedling: {
                Kp_multiplier: 0.8,
                moisture_offset: 6,
                evap_multiplier: 0.85
            },
            vegetative: {
                Kp_multiplier: 1.0,
                moisture_offset: 0,
                evap_multiplier: 1.0
            },
            mature: {
                Kp_multiplier: 1.05,
                moisture_offset: -1,
                evap_multiplier: 1.05
            }
        }
    }
};

/**
 * Determine growth stage based on days since planting
 */
export function detectGrowthStage(daysSincePlanting: number, cropType: string): GrowthStage {
    const profile = ADVANCED_CROP_PROFILES[cropType.toLowerCase()];

    if (!profile) {
        // Default stages for unknown crops
        if (daysSincePlanting < 3) return 'seedling';
        if (daysSincePlanting < 10) return 'vegetative';
        return 'mature';
    }

    // Crop-specific staging
    const totalDays = profile.optimalGrowthDays;
    const seedlingDays = Math.ceil(totalDays * 0.25);  // First 25% is seedling
    const vegetativeDays = Math.ceil(totalDays * 0.75); // 25-75% is vegetative

    if (daysSincePlanting < seedlingDays) return 'seedling';
    if (daysSincePlanting < vegetativeDays) return 'vegetative';
    return 'mature';
}

/**
 * Get adjusted control parameters for a specific crop and growth stage
 */
export function getCropControlParameters(
    cropType: string,
    growthStage: GrowthStage,
    temperature: number,
    humidity: number
): {
    setpoint: number;
    pidParams: PIDLiteParams;
    k_evap: number;
    diagnostics: Record<string, string | number>;
} {
    const profile = ADVANCED_CROP_PROFILES[cropType.toLowerCase()];

    if (!profile) {
        // Fallback for custom or unknown crops: return a basic balanced profile
        return {
            setpoint: 50,
            pidParams: {
                Kp_nominal: 1.0,
                pulse_min: 3,
                pulse_max: 20,
                cooldown_period: 60,
                activation_threshold: 5,
                hysteresis_band: 2
            },
            k_evap: 0.001,
            diagnostics: {
                cropName: cropType,
                stage: growthStage,
                Kp_base: 1.0,
                Kp_adjusted: 1.0,
                setpoint_base: 50,
            }
        };
    }

    // Get stage modifiers
    const stageMod = profile.stageModifiers[growthStage];

    // Adjust setpoint
    const setpoint = profile.trayMoistureMin + stageMod.moisture_offset;

    // Adjust PID parameters
    const pidParams: PIDLiteParams = {
        ...profile.pidParams,
        Kp_nominal: profile.pidParams.Kp_nominal * stageMod.Kp_multiplier
    };

    // Compute evaporation constant
    const k_evap = profile.evaporationConstant_base * stageMod.evap_multiplier;

    return {
        setpoint,
        pidParams,
        k_evap,
        diagnostics: {
            cropName: profile.name,
            stage: growthStage,
            Kp_base: profile.pidParams.Kp_nominal,
            Kp_adjusted: pidParams.Kp_nominal,
            setpoint_base: profile.trayMoistureMin,
            setpoint_adjusted: setpoint,
            k_evap_base: profile.evaporationConstant_base,
            k_evap_adjusted: k_evap
        }
    };
}

/**
 * Get list of all available crops
 */
export function getAvailableCrops(): string[] {
    return Object.keys(ADVANCED_CROP_PROFILES);
}

/**
 * Get crop profile by name
 */
export function getCropProfile(cropType: string): AdvancedCropProfile | null {
    return ADVANCED_CROP_PROFILES[cropType.toLowerCase()] || null;
}
