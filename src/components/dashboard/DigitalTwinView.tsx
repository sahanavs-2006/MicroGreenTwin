import { TwinPrediction, TwinSyncStatus, SensorData } from '@/types/agriculture';
import { Brain, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DigitalTwinViewProps {
  prediction: TwinPrediction;
  syncStatus: TwinSyncStatus;
  sensorData: SensorData;
}

export function DigitalTwinView({ prediction, syncStatus, sensorData }: DigitalTwinViewProps) {
  const getSyncStatusConfig = () => {
    switch (syncStatus) {
      case 'SYNCHRONIZED':
        return { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-success bg-success/20', label: 'Synchronized' };
      case 'CALIBRATING':
        return { icon: <RefreshCw className="w-4 h-4 animate-spin" />, color: 'text-warning bg-warning/20', label: 'Calibrating' };
      case 'DRIFTING':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-destructive bg-destructive/20', label: 'Drifting' };
      case 'OFFLINE':
        return { icon: <AlertCircle className="w-4 h-4" />, color: 'text-muted-foreground bg-muted', label: 'Offline' };
    }
  };

  const statusConfig = getSyncStatusConfig();

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Twin Status Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Digital Twin Engine</h3>
              <p className="text-xs text-muted-foreground">Predictive Climate Model</p>
            </div>
          </div>
          <div className={`state-badge ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{prediction.modelAccuracy.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Model Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{prediction.calibrationFactor.toFixed(2)}x</div>
            <div className="text-xs text-muted-foreground">Calibration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {prediction.predictedIrrigationTime !== null ? `${prediction.predictedIrrigationTime}h` : '--'}
            </div>
            <div className="text-xs text-muted-foreground">Next Irrigation</div>
          </div>
        </div>
      </div>

      {/* Real vs Predicted Comparison */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Real vs Predicted</h4>
        <div className="space-y-3">
          <ComparisonRow
            label="Tray Moisture"
            real={sensorData.soilMoisture}
            predicted={prediction.predictedTrayMoisture[0]}
            unit="%"
          />
          <ComparisonRow
            label="Temperature"
            real={sensorData.temperature}
            predicted={prediction.predictedTemp[0]}
            unit="°C"
          />
          <ComparisonRow
            label="Humidity"
            real={sensorData.humidity}
            predicted={prediction.predictedHumidity[0]}
            unit="%"
          />
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">AI Recommendations</h4>
        <div className="space-y-2">
          {prediction.recommendations.map((rec, index) => (
            <div
              key={index}
              className="p-2 rounded-lg bg-secondary/50 text-sm text-foreground"
            >
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  real,
  predicted,
  unit,
}: {
  label: string;
  real: number;
  predicted: number;
  unit: string;
}) {
  const diff = real - predicted;
  const diffColor = Math.abs(diff) < 2 ? 'text-success' : Math.abs(diff) < 5 ? 'text-warning' : 'text-destructive';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-4 font-mono text-sm">
        <span className="text-foreground">{real.toFixed(1)}{unit}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="text-primary">{predicted.toFixed(1)}{unit}</span>
        <span className={`text-xs ${diffColor}`}>
          ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
        </span>
      </div>
    </div>
  );
}
