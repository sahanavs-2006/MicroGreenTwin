/**
 * Digital Twin Validation Module
 * 
 * Implements quantitative validation metrics:
 * - RMSE (Root Mean Square Error)
 * - MAE (Mean Absolute Error)
 * - Model Confidence Score
 * - Control Mode Selection
 * 
 * Used to assess twin accuracy and determine if predictive control is safe
 */

export interface ValidationSample {
    predicted: number;
    actual: number;
    timestamp: number;
}

export interface ValidationMetrics {
    rmse: number | null;
    mae: number | null;
    confidence: number;
    sampleCount: number;
    controlMode: 'PREDICTIVE' | 'HYBRID' | 'REACTIVE';
}

export class TwinValidator {
    private samples: ValidationSample[] = [];
    private readonly windowSize: number;
    private readonly confidenceThresholds: {
        predictive: number;
        hybrid: number;
    };

    constructor(
        windowSize: number = 20,
        confidenceThresholds = { predictive: 0.85, hybrid: 0.60 }
    ) {
        this.windowSize = windowSize;
        this.confidenceThresholds = confidenceThresholds;
    }

    /**
     * Add a new prediction-actual pair to the validation window
     */
    public update(predicted: number, actual: number): void {
        this.samples.push({
            predicted,
            actual,
            timestamp: Date.now()
        });

        // Maintain rolling window
        if (this.samples.length > this.windowSize) {
            this.samples.shift();
        }
    }

    /**
     * Compute Root Mean Square Error over the window
     * 
     * RMSE = sqrt((1/N) × Σ(pred[i] - actual[i])²)
     * 
     * Interpretation:
     * - RMSE < 3%: Excellent twin quality
     * - RMSE 3-5%: Good twin quality
     * - RMSE 5-10%: Fair twin quality
     * - RMSE > 10%: Poor twin quality
     */
    public computeRMSE(): number | null {
        if (this.samples.length < 2) {
            return null;
        }

        const sumSquaredErrors = this.samples.reduce((sum, sample) => {
            const error = sample.predicted - sample.actual;
            return sum + error * error;
        }, 0);

        const mse = sumSquaredErrors / this.samples.length;
        return Math.sqrt(mse);
    }

    /**
     * Compute Mean Absolute Error over the window
     * 
     * MAE = (1/N) × Σ|pred[i] - actual[i]|
     * 
     * Less sensitive to outliers than RMSE
     */
    public computeMAE(): number | null {
        if (this.samples.length < 2) {
            return null;
        }

        const sumAbsErrors = this.samples.reduce((sum, sample) => {
            return sum + Math.abs(sample.predicted - sample.actual);
        }, 0);

        return sumAbsErrors / this.samples.length;
    }

    /**
     * Compute model confidence score from RMSE
     * 
     * Uses exponential decay: confidence = exp(-RMSE / σ)
     * 
     * Where σ = 15% is the max acceptable RMSE
     * 
     * Returns value in [0, 1]:
     * - 1.0: Perfect predictions
     * - 0.85+: High confidence
     * - 0.60-0.85: Medium confidence
     * - < 0.60: Low confidence
     */
    public computeConfidence(): number {
        const rmse = this.computeRMSE();

        if (rmse === null) {
            return 0.5;  // Neutral confidence when insufficient data
        }

        const sigma = 15.0;  // Max acceptable RMSE (%)
        const confidence = Math.exp(-rmse / sigma);

        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Select control mode based on confidence
     * 
     * PREDICTIVE (confidence > 0.85):
     *   - Use 4-hour forecast for proactive watering
     *   - Can pre-water based on predicted future deficits
     *   - Most efficient, requires high twin accuracy
     * 
     * HYBRID (confidence 0.60-0.85):
     *   - Blend reactive and predictive
     *   - Use predictions as hints, but verify with thresholds
     *   - Moderate efficiency, moderate safety
     * 
     * REACTIVE (confidence < 0.60):
     *   - Fall back to threshold-based control
     *   - Ignore predictions, use only sensor readings
     *   - Most conservative, proven safe
     */
    public selectControlMode(): 'PREDICTIVE' | 'HYBRID' | 'REACTIVE' {
        const confidence = this.computeConfidence();

        if (confidence > this.confidenceThresholds.predictive) {
            return 'PREDICTIVE';
        } else if (confidence > this.confidenceThresholds.hybrid) {
            return 'HYBRID';
        } else {
            return 'REACTIVE';
        }
    }

    /**
     * Get all validation metrics at once
     */
    public getMetrics(): ValidationMetrics {
        return {
            rmse: this.computeRMSE(),
            mae: this.computeMAE(),
            confidence: this.computeConfidence(),
            sampleCount: this.samples.length,
            controlMode: this.selectControlMode()
        };
    }

    /**
     * Get human-readable quality assessment
     */
    public getQualityAssessment(): {
        category: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Insufficient Data';
        description: string;
        recommendation: string;
    } {
        const rmse = this.computeRMSE();

        if (rmse === null) {
            return {
                category: 'Insufficient Data',
                description: 'Not enough samples to assess twin quality',
                recommendation: 'Collect more data (need at least 2 samples)'
            };
        }

        if (rmse < 3) {
            return {
                category: 'Excellent',
                description: 'Twin predictions are highly accurate',
                recommendation: 'Safe to use predictive control'
            };
        } else if (rmse < 5) {
            return {
                category: 'Good',
                description: 'Twin predictions are reliable',
                recommendation: 'Can use predictive control with caution'
            };
        } else if (rmse < 10) {
            return {
                category: 'Fair',
                description: 'Twin predictions have moderate errors',
                recommendation: 'Use hybrid control or reactive mode'
            };
        } else {
            return {
                category: 'Poor',
                description: 'Twin predictions are unreliable',
                recommendation: 'Use reactive control only. Consider recalibration.'
            };
        }
    }

    /**
     * Check if recalibration is needed
     */
    public needsRecalibration(): boolean {
        const rmse = this.computeRMSE();
        return rmse !== null && rmse > 10;
    }

    /**
     * Reset validation history
     */
    public reset(): void {
        this.samples = [];
    }

    /**
     * Get recent samples for debugging
     */
    public getRecentSamples(count: number = 5): ValidationSample[] {
        return this.samples.slice(-count);
    }
}

/**
 * Export singleton instance with default parameters
 */
export const twinValidator = new TwinValidator(20, {
    predictive: 0.85,
    hybrid: 0.60
});
