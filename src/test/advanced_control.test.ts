import { describe, it, expect, beforeEach } from 'vitest';
import { PIDLiteController } from '../lib/PIDLiteController';
import { TwinValidator } from '../lib/TwinValidator';

describe('PIDLiteController', () => {
    let controller: PIDLiteController;
    const params = {
        Kp_nominal: 1.0,
        pulse_min: 3,
        pulse_max: 30,
        cooldown_period: 60,
        activation_threshold: 5,
        hysteresis_band: 2,
    };

    beforeEach(() => {
        controller = new PIDLiteController(params);
    });

    it('should not compute pulse if error is below threshold', () => {
        const env = { temperature: 22, humidity: 50, k_evap_base: 0.001 };
        const duration = controller.computeControl(50, 48, env); // Error = 2, threshold = 5
        expect(duration).toBe(0);
    });

    it('should compute pulse if error is above threshold', () => {
        const env = { temperature: 22, humidity: 50, k_evap_base: 0.001 };
        const duration = controller.computeControl(50, 40, env); // Error = 10, threshold = 5
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeGreaterThanOrEqual(params.pulse_min);
        expect(duration).toBeLessThanOrEqual(params.pulse_max);
    });

    it('should respect cooldown period', () => {
        const env = { temperature: 22, humidity: 50, k_evap_base: 0.001 };
        controller.computeControl(50, 40, env); // First pulse
        const duration = controller.computeControl(50, 40, env); // Immediate second pulse
        expect(duration).toBe(0); // Should be in cooldown
    });

    it('should adjust gain based on temperature', () => {
        const envHot = { temperature: 30, humidity: 50, k_evap_base: 0.001 };
        const envNormal = { temperature: 22, humidity: 50, k_evap_base: 0.001 };

        // We need to reset controller to avoid cooldown
        const controller1 = new PIDLiteController(params);
        const durationNormal = controller1.computeControl(50, 40, envNormal);

        const controller2 = new PIDLiteController(params);
        const durationHot = controller2.computeControl(50, 40, envHot);

        expect(durationHot).toBeGreaterThanOrEqual(durationNormal);
    });
});

describe('TwinValidator', () => {
    let validator: TwinValidator;

    beforeEach(() => {
        validator = new TwinValidator(10, { predictive: 0.85, hybrid: 0.60 });
    });

    it('should calculate RMSE correctly', () => {
        validator.update(50, 48); // Error = 2
        validator.update(50, 52); // Error = -2
        // RMSE = sqrt((2^2 + (-2)^2) / 2) = sqrt(4) = 2
        expect(validator.computeRMSE()).toBeCloseTo(2);
    });

    it('should report high confidence for low RMSE', () => {
        validator.update(50, 50);
        validator.update(51, 51);
        expect(validator.computeConfidence()).toBeGreaterThan(0.9);
        expect(validator.selectControlMode()).toBe('PREDICTIVE');
    });

    it('should report low confidence for high RMSE', () => {
        validator.update(50, 30); // Error = 20
        validator.update(50, 70); // Error = -20
        expect(validator.computeConfidence()).toBeLessThan(0.4);
        expect(validator.selectControlMode()).toBe('REACTIVE');
    });
});
