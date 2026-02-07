import { Activity, TrendingUp, Gauge, Sliders, Droplet } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface ValidationMetrics {
    rmse: number | null;
    confidence: number;
    controlMode: 'PREDICTIVE' | 'HYBRID' | 'REACTIVE';
}

interface AdvancedControlPanelProps {
    validationMetrics: ValidationMetrics;
    pumpDurationScheduled: number;
    manualWaterLevel: number | null;
    setManualWaterLevel: (val: number | null) => void;
}

export function AdvancedControlPanel({
    validationMetrics,
    pumpDurationScheduled,
    manualWaterLevel,
    setManualWaterLevel,
}: AdvancedControlPanelProps) {
    const { rmse, confidence, controlMode } = validationMetrics;

    // Confidence percentage
    const confidencePct = (confidence * 100).toFixed(0);

    // RMSE quality category
    const getRMSEQuality = () => {
        if (rmse === null) return { label: 'Insufficient Data', color: 'text-muted-foreground' };
        if (rmse < 3) return { label: 'Excellent', color: 'text-success' };
        if (rmse < 5) return { label: 'Good', color: 'text-lime-400' };
        if (rmse < 10) return { label: 'Fair', color: 'text-warning' };
        return { label: 'Poor', color: 'text-destructive' };
    };

    const rmseQuality = getRMSEQuality();

    // Control mode styling
    const getModeStyle = () => {
        switch (controlMode) {
            case 'PREDICTIVE':
                return { color: 'text-success', bg: 'bg-success/20' };
            case 'HYBRID':
                return { color: 'text-warning', bg: 'bg-warning/20' };
            case 'REACTIVE':
                return { color: 'text-blue-400', bg: 'bg-blue-400/20' };
        }
    };

    const modeStyle = getModeStyle();

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="glass-card p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Advanced Control</h3>
                        <p className="text-xs text-muted-foreground">PID-Lite + Twin Validation</p>
                    </div>
                </div>
            </div>

            {/* Artificial Simulation Section (MANUAL OVERRIDE) */}
            <div className="glass-card p-4 border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground italic">Artificial Simulation</span>
                    </div>
                    <Badge variant={manualWaterLevel !== null ? "default" : "outline"} className="text-[10px]">
                        {manualWaterLevel !== null ? "OVERRIDE ACTIVE" : "AUTO MODE"}
                    </Badge>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                                <Droplet className="w-3 h-3" /> Manual Water Level
                            </span>
                            <span className="font-mono text-primary font-bold">
                                {manualWaterLevel !== null ? `${manualWaterLevel.toFixed(1)}%` : "Real-time Sensor"}
                            </span>
                        </div>
                        <Slider
                            value={[manualWaterLevel ?? 50]}
                            max={100}
                            step={0.5}
                            onValueChange={(vals) => setManualWaterLevel(vals[0])}
                            className="py-2"
                        />
                    </div>

                    {manualWaterLevel !== null && (
                        <button
                            onClick={() => setManualWaterLevel(null)}
                            className="w-full py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors underline"
                        >
                            Disable Override & Return to Sensor
                        </button>
                    )}
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                {/* Twin RMSE */}
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Twin RMSE</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                            {rmse !== null ? rmse.toFixed(1) : '--'}
                        </span>
                        <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className={`text-xs mt-1 ${rmseQuality.color}`}>
                        {rmseQuality.label}
                    </div>
                </div>

                {/* Confidence Score */}
                <div className="glass-card p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Confidence</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                            {confidencePct}
                        </span>
                        <span className="text-sm text-muted-foreground">%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${confidencePct}%` }}
                        />
                    </div>
                </div>

                {/* Control Mode */}
                <div className="glass-card p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                        Control Mode
                    </div>
                    <div className={`inline-block px-3 py-1 rounded-lg ${modeStyle.bg}`}>
                        <span className={`text-sm font-mono font-semibold ${modeStyle.color}`}>
                            {controlMode}
                        </span>
                    </div>
                </div>

                {/* Scheduled Pump Duration */}
                <div className="glass-card p-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                        Next Pump Duration
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                            {pumpDurationScheduled}
                        </span>
                        <span className="text-sm text-muted-foreground">sec</span>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="glass-card p-3">
                <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                        <span>RMSE {'<'} 3%:</span>
                        <span className="font-medium">Excellent twin accuracy</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Confidence {'>'} 85%:</span>
                        <span className="font-medium">Predictive control enabled</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Pump Duration:</span>
                        <span className="font-medium">PID-lite adaptive output</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
