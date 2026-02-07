/**
 * Advanced Control System for MicroGreenTwin
 * 
 * This module implements:
 * - PID-Lite Controller (Proportional + Hysteresis)
 * - Adaptive Gain Scheduling
 * - Crop-Aware Parameter Injection
 * 
 * Engineering-grade control theory for precision agriculture
 */

export interface PIDLiteParams {
    Kp_nominal: number;       // Nominal proportional gain (sec/%)
    pulse_min: number;        // Minimum pump duration (seconds)
    pulse_max: number;        // Maximum pump duration (seconds)
    cooldown_period: number;  // Minimum time between pump cycles (seconds)
    activation_threshold: number; // Minimum error to activate pump (%)
    hysteresis_band: number;  // Hysteresis width (%)
}

export interface EnvironmentalState {
    temperature: number;  // °C
    humidity: number;     // %
    k_evap_base: number;  // Base evaporation constant (hr^-1)
}

export class PIDLiteController {
    private params: PIDLiteParams;
    private lastPumpTime: number = 0;
    private lastPulseDuration: number = 0;
    private isPumping: boolean = false;

    constructor(params: PIDLiteParams) {
        this.params = params;
    }

    public updateParams(params: PIDLiteParams): void {
        this.params = params;
    }

    /**
     * Compute adaptive proportional gain based on environmental conditions
     * Uses evaporation rate to scale control aggressiveness
     * 
     * Theory: Fast evaporation → Higher gain (more aggressive)
     *         Slow evaporation → Lower gain (gentler)
     */
    private computeAdaptiveGain(env: EnvironmentalState): number {
        // Evaporation model: k_evap = k_base × (1 + α_T(T - T_ref)) × (1 - β_H(H - H_ref)/100)
        const T_ref = 22;  // Reference temperature (°C)
        const H_ref = 50;  // Reference humidity (%)
        const alpha_T = 0.03;  // Temperature coefficient (per °C)
        const beta_H = 0.02;   // Humidity coefficient (per %)

        const k_evap = env.k_evap_base *
            (1 + alpha_T * (env.temperature - T_ref)) *
            (1 - beta_H * (env.humidity - H_ref) / 100);

        // Normalize evaporation rate
        const k_base_ref = 0.001;  // hr^-1 (reference evaporation rate)
        const k_norm = k_evap / k_base_ref;

        // Adaptive gain: Kp ∝ sqrt(k_evap) for stability
        // sqrt prevents excessive gain in extreme conditions
        const Kp_adaptive = this.params.Kp_nominal * Math.sqrt(Math.max(0.5, k_norm));

        // Safety limits
        const Kp_min = this.params.Kp_nominal * 0.5;
        const Kp_max = this.params.Kp_nominal * 2.0;

        return Math.max(Kp_min, Math.min(Kp_max, Kp_adaptive));
    }

    /**
     * Main control law: u(t) = Kp × e(t)
     * 
     * @param setpoint - Target moisture (%)
     * @param processVariable - Current moisture (%)
     * @param env - Environmental state (T, H, k_evap)
     * @returns Pump duration in seconds (0 if no action needed)
     */
    public computeControl(
        setpoint: number,
        processVariable: number,
        env: EnvironmentalState
    ): number {
        // Error computation
        const error = setpoint - processVariable;

        const now = Date.now();

        // Hysteresis state machine
        if (this.isPumping) {
            // Check if control action has finished (pulse complete)
            const timeSincePump = (now - this.lastPumpTime) / 1000;

            // If the pulse is theoretically finished, we reset the pumping state
            // enabling the controller to evaluate if another pulse is needed (subject to cooldown)
            // We use a small buffer (1s) to ensure we don't flap
            if (timeSincePump > this.lastPulseDuration + 1.0) {
                this.isPumping = false;
                // Fall through to normal logic to check if we need another pulse
            } else {
                // Currently pumping (physically) - check if we should logically stop early
                if (error < this.params.hysteresis_band) {
                    this.isPumping = false;
                    return 0;
                }
                // Continue pumping (handled by duration in previous call)
                return 0;
            }
        }

        if (error < this.params.activation_threshold) {
            return 0;  // Error too small
        }

        // Cooldown check
        if ((now - this.lastPumpTime) / 1000 < this.params.cooldown_period) {
            return 0;  // Still in cooldown
        }

        // Compute adaptive gain
        const Kp = this.computeAdaptiveGain(env);

        // Control output: u = Kp × e
        let pumpDuration = Kp * error;

        // Saturation limits
        pumpDuration = Math.max(this.params.pulse_min,
            Math.min(this.params.pulse_max, pumpDuration));

        // Update state
        this.lastPumpTime = now;
        this.isPumping = true;
        this.lastPulseDuration = Math.round(pumpDuration);

        return Math.round(pumpDuration);
    }

    /**
     * Get current controller diagnostics
     */
    public getDiagnostics(env: EnvironmentalState) {
        return {
            Kp_adaptive: this.computeAdaptiveGain(env),
            Kp_nominal: this.params.Kp_nominal,
            isPumping: this.isPumping,
            cooldownRemaining: Math.max(0,
                this.params.cooldown_period - (Date.now() - this.lastPumpTime) / 1000
            )
        };
    }

    /**
     * Reset controller state
     * @param hardReset - If true, also clears cooldown timers
     */
    public reset(hardReset: boolean = false) {
        this.isPumping = false;
        if (hardReset) {
            this.lastPumpTime = 0;
        }
    }
}

/**
 * Default PID-Lite parameters (tuned for mustard greens)
 */
export const DEFAULT_PID_PARAMS: PIDLiteParams = {
    Kp_nominal: 1.0,          // 1 second per 1% error
    pulse_min: 3,             // Minimum 3 seconds
    pulse_max: 30,            // Maximum 30 seconds
    cooldown_period: 60,      // 1 minute rest
    activation_threshold: 5,  // Activate at 5% error
    hysteresis_band: 2        // 2% hysteresis
};
