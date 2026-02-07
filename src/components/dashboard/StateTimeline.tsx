import { FSMTransition, FSMState, STATE_DISPLAY_NAMES } from '@/types/agriculture';
import { ArrowRight, History, Activity, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StateTimelineProps {
  currentState: FSMState;
  transitionHistory: FSMTransition[];
}

const FSM_FLOW: FSMState[] = [
  'IDLE',
  'READ_ENVIRONMENT',
  'ANALYZE_CLIMATE',
  'WATER_TRAY',
  'STABILIZE_ENV',
  'SAFE_MONITOR',
];

const FAULT_STATES: FSMState[] = ['LOW_WATER_FAULT', 'SENSOR_FAILURE', 'PUMP_FAILURE', 'SAFE_STOP'];

export function StateTimeline({ currentState, transitionHistory }: StateTimelineProps) {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const isFaultState = FAULT_STATES.includes(currentState);

  return (
    <div className="glass-card p-6 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          FSM State Sequence
        </h3>
        {isFaultState && (
          <div className="flex items-center gap-2 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            System Fault Detected
          </div>
        )}
      </div>

      {/* Visual Flow Diagram */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2 rounded-full" />

        <div className="flex items-center justify-between relative z-10 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide mask-fade-sides">
          {FSM_FLOW.map((state, index) => {
            const isActive = currentState === state;
            const isPast = false; // logic for past could be added if sequential certainty exists

            return (
              <div key={state} className="flex-shrink-0 flex flex-col items-center gap-2 px-2 group cursor-default">
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all duration-500 z-20 relative
                    ${isActive
                      ? 'bg-primary border-primary shadow-[0_0_15px_rgba(var(--primary),0.6)] scale-125'
                      : 'bg-background border-muted-foreground/30 group-hover:border-primary/50'}
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                  )}
                </div>

                <div
                  className={`
                    text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-300 border backdrop-blur-sm
                    ${isActive
                      ? 'bg-primary/10 border-primary/50 text-foreground translate-y-0 shadow-sm'
                      : 'bg-card/50 border-transparent text-muted-foreground/70 -translate-y-1 hover:-translate-y-2 hover:text-foreground hover:border-border'}
                  `}
                >
                  {STATE_DISPLAY_NAMES[state]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transition Log */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
          <History className="w-3 h-3" />
          State Logic Log
        </div>

        <ScrollArea className="h-[200px] w-full rounded-md border bg-slate-950/50 p-2">
          {transitionHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              Waiting for transitions...
            </div>
          ) : (
            <div className="space-y-1">
              {[...transitionHistory].reverse().map((transition, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-3 text-xs p-2 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5"
                >
                  <span className="font-mono text-xs text-muted-foreground/60 min-w-[65px]">
                    {formatTime(transition.timestamp)}
                  </span>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-mono text-[10px]">
                      {transition.from}
                    </span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${transition.to.includes('FAULT') || transition.to.includes('FAILURE') ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                      }`}>
                      {transition.to}
                    </span>
                  </div>

                  <span className="text-[10px] text-muted-foreground/50 border border-white/10 px-1.5 py-0.5 rounded max-w-[120px] truncate" title={transition.trigger}>
                    {transition.trigger}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
