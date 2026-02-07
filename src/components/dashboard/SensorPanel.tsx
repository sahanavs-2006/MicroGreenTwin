import { Droplets, Thermometer, Wind, Container } from 'lucide-react';
import { SensorData, CropProfile } from '@/types/agriculture';

interface SensorPanelProps {
  sensorData: SensorData;
  cropProfile: CropProfile;
}

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  icon: React.ReactNode;
  color: string;
  status: 'optimal' | 'warning' | 'critical' | 'info';
  statusLabel: string;
  isInvalid?: boolean;
}

function MetricCard({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  icon,
  color,
  status,
  statusLabel,
  isInvalid,
}: MetricCardProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  const statusColors = {
    optimal: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive',
    info: 'text-muted-foreground',
  };

  const barColors = {
    optimal: 'bg-success',
    warning: 'bg-warning',
    critical: 'bg-destructive',
    info: 'bg-muted-foreground',
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md bg-${color}/20`}>
            <span className={`text-${color}`}>{icon}</span>
          </div>
          <span className="data-label">{label}</span>
        </div>
        <span className={`text-xs font-medium ${statusColors[status]}`}>
          {statusLabel}
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`data-value ${isInvalid ? 'text-destructive' : `text-${color}`}`}>
          {isInvalid ? 'ERR' : value.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>

      <div className="gauge-bar">
        <div
          className={`gauge-fill ${isInvalid ? 'bg-destructive' : barColors[status]}`}
          style={{ width: isInvalid ? '100%' : `${percentage}%` }}
        />
      </div>

      {!isInvalid && (
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      )}
    </div>
  );
}

export function SensorPanel({ sensorData, cropProfile }: SensorPanelProps) {
  const getMoistureStatus = (): { status: 'optimal' | 'warning' | 'critical'; label: string } => {
    if (sensorData.soilMoisture < 0) return { status: 'critical', label: 'ERROR' };
    if (sensorData.soilMoisture < cropProfile.trayMoistureMin - 5) return { status: 'critical', label: 'Critical' };
    if (sensorData.soilMoisture < cropProfile.trayMoistureMin) return { status: 'warning', label: 'Dry' };
    if (sensorData.soilMoisture > cropProfile.trayMoistureMax) return { status: 'warning', label: 'Wet' };
    return { status: 'optimal', label: 'Optimal' };
  };

  const getTempStatus = (): { status: 'optimal' | 'warning' | 'info'; label: string } => {
    if (sensorData.temperature < -50) return { status: 'warning', label: 'ERROR' };
    if (sensorData.temperature < cropProfile.tempMin) return { status: 'info', label: 'Cool' };
    if (sensorData.temperature > cropProfile.tempMax) return { status: 'info', label: 'Warm' };
    return { status: 'optimal', label: 'Normal' };
  };

  const getHumidityStatus = (): { status: 'optimal' | 'warning' | 'info'; label: string } => {
    if (sensorData.humidity < 0) return { status: 'warning', label: 'ERROR' };
    if (sensorData.humidity < cropProfile.humidityMin) return { status: 'info', label: 'Low' };
    if (sensorData.humidity > cropProfile.humidityMax) return { status: 'info', label: 'High' };
    return { status: 'optimal', label: 'Normal' };
  };

  const getWaterStatus = (): { status: 'optimal' | 'warning' | 'critical'; label: string } => {
    if (sensorData.waterLevel < 0) return { status: 'critical', label: 'ERROR' };
    if (sensorData.waterLevel < 15) return { status: 'critical', label: 'Empty' };
    if (sensorData.waterLevel < 30) return { status: 'warning', label: 'Low' };
    return { status: 'optimal', label: 'Good' };
  };

  const moistureStatus = getMoistureStatus();
  const tempStatus = getTempStatus();
  const humidityStatus = getHumidityStatus();
  const waterStatus = getWaterStatus();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
      <MetricCard
        label="Tray Moisture"
        value={sensorData.soilMoisture}
        unit="%"
        min={0}
        max={100}
        icon={<Droplets className="w-4 h-4" />}
        color="moisture"
        status={moistureStatus.status}
        statusLabel={moistureStatus.label}
        isInvalid={sensorData.soilMoisture < 0}
      />
      <MetricCard
        label="Temperature"
        value={sensorData.temperature}
        unit="°C"
        min={15}
        max={35}
        icon={<Thermometer className="w-4 h-4" />}
        color="temperature"
        status={tempStatus.status}
        statusLabel={tempStatus.label}
        isInvalid={sensorData.temperature < -50}
      />
      <MetricCard
        label="Humidity"
        value={sensorData.humidity}
        unit="%"
        min={20}
        max={90}
        icon={<Wind className="w-4 h-4" />}
        color="humidity"
        status={humidityStatus.status}
        statusLabel={humidityStatus.label}
        isInvalid={sensorData.humidity < 0}
      />
      <MetricCard
        label="Water Tank"
        value={sensorData.waterLevel}
        unit="%"
        min={0}
        max={100}
        icon={<Container className="w-4 h-4" />}
        color="water-level"
        status={waterStatus.status}
        statusLabel={waterStatus.label}
        isInvalid={sensorData.waterLevel < 0}
      />
    </div>
  );
}
