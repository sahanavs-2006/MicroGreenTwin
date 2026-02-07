import { FaultInjection } from '@/types/agriculture';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Wifi, Droplets, Cpu, Zap } from 'lucide-react';

interface FaultInjectionPanelProps {
  faultInjection: FaultInjection;
  onInjectFault: (type: keyof FaultInjection, active: boolean) => void;
  isRunning: boolean;
}

interface FaultToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  isActive: boolean;
  onChange: (active: boolean) => void;
  disabled: boolean;
}

function FaultToggle({ label, description, icon, isActive, onChange, disabled }: FaultToggleProps) {
  return (
    <div className={`
      glass-card p-4 transition-all duration-300
      ${isActive ? 'border-destructive/50 bg-destructive/10' : ''}
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg transition-colors
            ${isActive ? 'bg-destructive/20 text-destructive' : 'bg-muted text-muted-foreground'}
          `}>
            {icon}
          </div>
          <div>
            <div className="font-medium text-foreground">{label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          </div>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={onChange}
          disabled={disabled}
          className="data-[state=checked]:bg-destructive"
        />
      </div>
      {isActive && (
        <div className="mt-3 flex items-center gap-2 text-xs text-destructive animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span>Fault Active - System Response in Progress</span>
        </div>
      )}
    </div>
  );
}

export function FaultInjectionPanel({ faultInjection, onInjectFault, isRunning }: FaultInjectionPanelProps) {
  const faults: Array<{
    key: keyof FaultInjection;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
      {
        key: 'sensorFailure',
        label: 'Sensor Failure',
        description: 'Sets all sensor readings to invalid values (-1, -99)',
        icon: <Cpu className="w-4 h-4" />,
      },
      {
        key: 'waterTankEmpty',
        label: 'Water Tank Empty',
        description: 'Forces water level to drain rapidly (5% per cycle)',
        icon: <Droplets className="w-4 h-4" />,
      },
      {
        key: 'pumpFailure',
        label: 'Pump Failure',
        description: 'Pump becomes unresponsive to commands',
        icon: <Zap className="w-4 h-4" />,
      },
      {
        key: 'communicationLoss',
        label: 'Communication Loss',
        description: 'Freezes all system processing (FSM, sensors, cycle count)',
        icon: <Wifi className="w-4 h-4" />,
      },
    ];

  const activeFaultCount = Object.values(faultInjection).filter(Boolean).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Fault Injection Lab</h3>
              <p className="text-xs text-muted-foreground">Test FSM safety responses</p>
            </div>
          </div>
          {activeFaultCount > 0 && (
            <div className="state-badge bg-destructive/20 text-destructive border border-destructive/30">
              {activeFaultCount} Fault{activeFaultCount > 1 ? 's' : ''} Active
            </div>
          )}
        </div>

        {!isRunning && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
            ⚠️ Start the system to test fault responses
          </div>
        )}
      </div>

      {/* Fault Toggles */}
      <div className="grid gap-3">
        {faults.map((fault) => (
          <FaultToggle
            key={fault.key}
            label={fault.label}
            description={fault.description}
            icon={fault.icon}
            isActive={faultInjection[fault.key]}
            onChange={(active) => onInjectFault(fault.key, active)}
            disabled={!isRunning}
          />
        ))}
      </div>

      {/* Instructions */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">How It Works</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Toggle a fault to inject it into the system</li>
          <li>• Watch the FSM transition to safety states</li>
          <li>• Observe how the system recovers when fault is cleared</li>
          <li>• Test multiple faults simultaneously for stress testing</li>
        </ul>
      </div>
    </div>
  );
}
