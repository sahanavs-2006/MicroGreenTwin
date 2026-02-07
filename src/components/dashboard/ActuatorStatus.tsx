import { useState, useEffect } from 'react';
import { Droplets } from 'lucide-react';
import { ActuatorState } from '@/types/agriculture';

interface ActuatorStatusProps {
  actuatorState: ActuatorState;
}

export function ActuatorStatus({ actuatorState }: ActuatorStatusProps) {
  const { irrigationLED, lastToggleTime } = actuatorState;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const runtime = Math.floor((now - lastToggleTime) / 1000);

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="data-label">Actuator Control</span>
        <span className="text-xs text-muted-foreground font-mono">GPIO: D1</span>
      </div>

      <div className="flex items-center gap-4">
        {/* LED Indicator */}
        <div className="relative">
          <div
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
              ${irrigationLED
                ? 'bg-pump led-indicator pump-pulse'
                : 'bg-muted border border-border'
              }
            `}
          >
            <Droplets className={`w-6 h-6 ${irrigationLED ? 'text-white' : 'text-muted-foreground'}`} />
          </div>
          {irrigationLED && (
            <div className="absolute -inset-1 rounded-full bg-pump/30 animate-ping" />
          )}
        </div>

        {/* Status Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${irrigationLED ? 'text-pump' : 'text-muted-foreground'}`}>
              Pump {irrigationLED ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Bottom Watering System
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Runtime:</span>
            <span className="font-mono text-xs">{runtime}s</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`
          state-badge
          ${irrigationLED
            ? 'bg-pump/20 text-pump border border-pump/30'
            : 'bg-muted text-muted-foreground'
          }
        `}>
          {irrigationLED ? 'ACTIVE' : 'STANDBY'}
        </div>
      </div>
    </div>
  );
}
