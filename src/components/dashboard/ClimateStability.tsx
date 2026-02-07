import { TwinPrediction, CropProfile } from '@/types/agriculture';

interface ClimateStabilityProps {
  prediction: TwinPrediction;
  cropProfile: CropProfile;
}

export function ClimateStability({ prediction, cropProfile }: ClimateStabilityProps) {
  const { stabilityIndex, irrigationRiskLevel } = prediction;

  const getStatusConfig = () => {
    if (stabilityIndex >= 80) {
      return { label: 'OPTIMAL', color: 'text-success', bgColor: 'bg-success', zone: 'SAFE' };
    } else if (stabilityIndex >= 50) {
      return { label: 'UNSTABLE', color: 'text-warning', bgColor: 'bg-warning', zone: 'WARNING' };
    } else {
      return { label: 'CRITICAL', color: 'text-destructive', bgColor: 'bg-destructive', zone: 'DANGER' };
    }
  };

  const getRiskColor = () => {
    switch (irrigationRiskLevel) {
      case 'low': return 'text-success';
      case 'medium': return 'text-warning';
      case 'high': return 'text-destructive';
    }
  };

  const status = getStatusConfig();
  
  // Calculate the ring circumference and dash offset
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (stabilityIndex / 100) * circumference;

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="data-label">Climate Monitoring Index</span>
        <span className={`state-badge ${status.bgColor}/20 ${status.color} border border-current/30`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Ring Gauge */}
        <div className="relative w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke="hsl(220, 15%, 20%)"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              fill="none"
              stroke={stabilityIndex >= 80 ? 'hsl(142, 76%, 36%)' : stabilityIndex >= 50 ? 'hsl(35, 92%, 50%)' : 'hsl(0, 84%, 60%)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className={`text-2xl font-bold ${status.color}`}>
                {stabilityIndex.toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Growth Zone</span>
            <span className={`font-semibold ${status.color}`}>{status.zone}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Irrigation Risk</span>
            <span className={`font-semibold capitalize ${getRiskColor()}`}>{irrigationRiskLevel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Calibration</span>
            <span className="font-mono text-foreground">{prediction.calibrationFactor.toFixed(2)}x</span>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Crop Target:</div>
            <div className="text-xs font-mono">
              Moisture: {cropProfile.trayMoistureMin}-{cropProfile.trayMoistureMax}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
