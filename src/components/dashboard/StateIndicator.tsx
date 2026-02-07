import { FSMState, STATE_DISPLAY_NAMES } from '@/types/agriculture';
import { Activity, AlertTriangle, CheckCircle2, Loader2, Pause, Droplets, XCircle, Wifi } from 'lucide-react';

interface StateIndicatorProps {
  state: FSMState;
  isRunning: boolean;
  cycleCount: number;
}

const stateIcons: Record<FSMState, React.ReactNode> = {
  INIT: <Loader2 className="w-5 h-5 animate-spin" />,
  IDLE: <Pause className="w-5 h-5" />,
  READ_ENVIRONMENT: <Activity className="w-5 h-5 animate-pulse" />,
  ANALYZE_CLIMATE: <Activity className="w-5 h-5" />,
  WATER_TRAY: <Droplets className="w-5 h-5 animate-bounce" />,
  STABILIZE_ENV: <Loader2 className="w-5 h-5 animate-spin" />,
  SAFE_MONITOR: <CheckCircle2 className="w-5 h-5" />,
  LOW_WATER_FAULT: <AlertTriangle className="w-5 h-5" />,
  SENSOR_FAILURE: <XCircle className="w-5 h-5" />,
  PUMP_FAILURE: <XCircle className="w-5 h-5" />,
  COMMUNICATION_FAULT: <Wifi className="w-5 h-5 animate-pulse" />,
  SAFE_STOP: <Pause className="w-5 h-5" />,
};

const stateColors: Record<FSMState, string> = {
  INIT: 'bg-muted text-muted-foreground',
  IDLE: 'bg-muted text-muted-foreground',
  READ_ENVIRONMENT: 'bg-primary/20 text-primary border-primary/50',
  ANALYZE_CLIMATE: 'bg-primary/20 text-primary border-primary/50',
  WATER_TRAY: 'bg-pump/20 text-pump border-pump/50',
  STABILIZE_ENV: 'bg-warning/20 text-warning border-warning/50',
  SAFE_MONITOR: 'bg-success/20 text-success border-success/50',
  LOW_WATER_FAULT: 'bg-destructive/20 text-destructive border-destructive/50',
  SENSOR_FAILURE: 'bg-destructive/20 text-destructive border-destructive/50',
  PUMP_FAILURE: 'bg-destructive/20 text-destructive border-destructive/50',
  COMMUNICATION_FAULT: 'bg-destructive/20 text-destructive border-destructive/50',
  SAFE_STOP: 'bg-muted text-muted-foreground',
};

export function StateIndicator({ state, isRunning, cycleCount }: StateIndicatorProps) {
  const isFault = state === 'LOW_WATER_FAULT' || state === 'SENSOR_FAILURE' || state === 'PUMP_FAILURE' || state === 'COMMUNICATION_FAULT';
  const isActive = state === 'WATER_TRAY' || state === 'READ_ENVIRONMENT' || state === 'ANALYZE_CLIMATE';

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <span className="data-label">FSM State</span>
        <div className="flex items-center gap-2">
          <div className={`status-dot ${isRunning ? 'online' : 'offline'}`} />
          <span className="text-xs text-muted-foreground">
            {isRunning ? 'RUNNING' : 'STOPPED'}
          </span>
        </div>
      </div>

      <div className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all duration-300
        ${stateColors[state]}
        ${isActive ? 'glow-ring' : ''}
        ${isFault ? 'animate-pulse' : ''}
      `}>
        {stateIcons[state]}
        <div className="flex-1">
          <div className="font-semibold text-sm">{STATE_DISPLAY_NAMES[state]}</div>
          <div className="text-xs opacity-70 font-mono">{state}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Cycle Count</span>
        <span className="font-mono">{cycleCount}</span>
      </div>
    </div>
  );
}
