import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TwinPrediction } from '@/types/agriculture';
import { Button } from '@/components/ui/button';
import { Droplets, Thermometer, Wind } from 'lucide-react';

interface PredictionChartProps {
  prediction: TwinPrediction;
}

type ChartView = 'moisture' | 'temperature' | 'humidity';

export function PredictionChart({ prediction }: PredictionChartProps) {
  const [view, setView] = useState<ChartView>('moisture');

  const currentHour = new Date().getHours();
  
  const chartData = prediction.predictedTrayMoisture.map((_, index) => {
    const hour = (currentHour + index) % 24;
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      moisture: prediction.predictedTrayMoisture[index],
      temperature: prediction.predictedTemp[index],
      humidity: prediction.predictedHumidity[index],
    };
  });

  const getChartConfig = () => {
    switch (view) {
      case 'moisture':
        return {
          dataKey: 'moisture',
          color: 'hsl(200, 90%, 55%)',
          gradient: ['hsl(200, 90%, 55%)', 'hsl(200, 90%, 25%)'],
          min: prediction.safeZone.moisture[0],
          max: prediction.safeZone.moisture[1],
          unit: '%',
          label: 'Tray Moisture',
        };
      case 'temperature':
        return {
          dataKey: 'temperature',
          color: 'hsl(0, 85%, 60%)',
          gradient: ['hsl(0, 85%, 60%)', 'hsl(0, 85%, 30%)'],
          min: prediction.safeZone.temp[0],
          max: prediction.safeZone.temp[1],
          unit: '°C',
          label: 'Temperature',
        };
      case 'humidity':
        return {
          dataKey: 'humidity',
          color: 'hsl(260, 70%, 60%)',
          gradient: ['hsl(260, 70%, 60%)', 'hsl(260, 70%, 30%)'],
          min: prediction.safeZone.humidity[0],
          max: prediction.safeZone.humidity[1],
          unit: '%',
          label: 'Humidity',
        };
    }
  };

  const config = getChartConfig();

  // Find when threshold is crossed
  const thresholdCrossing = view === 'moisture' 
    ? prediction.predictedIrrigationTime
    : null;

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">24-Hour Prediction</h3>
          <p className="text-xs text-muted-foreground">Digital Twin Forecast</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant={view === 'moisture' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('moisture')}
            className="gap-1"
          >
            <Droplets className="w-3 h-3" />
            Moisture
          </Button>
          <Button
            variant={view === 'temperature' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('temperature')}
            className="gap-1"
          >
            <Thermometer className="w-3 h-3" />
            Temp
          </Button>
          <Button
            variant={view === 'humidity' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('humidity')}
            className="gap-1"
          >
            <Wind className="w-3 h-3" />
            Humidity
          </Button>
        </div>
      </div>

      {thresholdCrossing !== null && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          ⚠️ Irrigation predicted in {thresholdCrossing} hours
        </div>
      )}

      <div className="h-[200px] chart-glow">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${view}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.gradient[0]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={config.gradient[1]} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 20%)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: 'hsl(210, 15%, 55%)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(220, 15%, 20%)' }}
              interval={3}
            />
            <YAxis
              tick={{ fill: 'hsl(210, 15%, 55%)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(220, 15%, 20%)' }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(220, 20%, 12%)',
                border: '1px solid hsl(220, 15%, 25%)',
                borderRadius: '8px',
                color: 'hsl(210, 20%, 92%)',
              }}
              formatter={(value: number) => [`${value.toFixed(1)}${config.unit}`, config.label]}
            />
            <ReferenceLine
              y={config.min}
              stroke="hsl(35, 92%, 50%)"
              strokeDasharray="5 5"
              label={{ value: 'MIN', fill: 'hsl(35, 92%, 50%)', fontSize: 10 }}
            />
            <ReferenceLine
              y={config.max}
              stroke="hsl(142, 76%, 36%)"
              strokeDasharray="5 5"
              label={{ value: 'MAX', fill: 'hsl(142, 76%, 36%)', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#gradient-${view})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-3 text-xs text-muted-foreground">
        <span>Safe Zone: {config.min} - {config.max}{config.unit}</span>
        <span>Model Accuracy: {prediction.modelAccuracy.toFixed(0)}%</span>
      </div>
    </div>
  );
}
