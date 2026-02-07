import { Play, Square, RotateCcw, Leaf, Usb, Sliders, Droplet } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CropType, CROP_DISPLAY_INFO, SystemConfig } from '@/types/agriculture';

interface ControlPanelProps {
  isRunning: boolean;
  config: SystemConfig;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onConfigChange: (config: Partial<SystemConfig>) => void;
  customCrops?: string[];
  hardwareConnected?: boolean;
  manualWaterLevel?: number | null;
  setManualWaterLevel?: (val: number | null) => void;
}

export function ControlPanel({
  isRunning,
  config,
  onStart,
  onStop,
  onReset,
  onConfigChange,
  customCrops = [],
  hardwareConnected = false,
  manualWaterLevel = null,
  setManualWaterLevel = () => { },
}: ControlPanelProps) {
  const builtInCrops = Object.keys(CROP_DISPLAY_INFO) as CropType[];
  const allCrops = [...builtInCrops, ...customCrops];

  const isBuiltIn = builtInCrops.includes(config.selectedCrop as CropType);
  const selectedCropInfo = isBuiltIn
    ? CROP_DISPLAY_INFO[config.selectedCrop as CropType]
    : { emoji: '🌿', name: config.selectedCrop, days: 'Custom' };

  return (
    <div className="glass-card p-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">MicroGreenTwin</h1>
            <p className="text-xs text-muted-foreground font-mono">Automated FSM Control System</p>
          </div>
          {hardwareConnected && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
              <Usb className="w-3 h-3" />
              <span className="hidden sm:inline">Hardware</span>
            </Badge>
          )}
        </div>

        {/* Crop Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Crop Profile:</span>
          <Select
            value={config.selectedCrop}
            onValueChange={(value) => onConfigChange({ selectedCrop: value as CropType })}
            disabled={isRunning}
          >
            <SelectTrigger className="w-[180px] bg-secondary border-border">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{selectedCropInfo.emoji}</span>
                  <span>{selectedCropInfo.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Built-in crops */}
              {builtInCrops.map((crop) => (
                <SelectItem key={crop} value={crop}>
                  <span className="flex items-center gap-2">
                    <span>{CROP_DISPLAY_INFO[crop].emoji}</span>
                    <span>{CROP_DISPLAY_INFO[crop].name}</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      ({CROP_DISPLAY_INFO[crop].days})
                    </span>
                  </span>
                </SelectItem>
              ))}
              {/* Custom crops */}
              {customCrops.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-t border-border mt-1">
                    Custom Profiles
                  </div>
                  {customCrops.map((crop) => (
                    <SelectItem key={crop} value={crop}>
                      <span className="flex items-center gap-2">
                        <span>🌿</span>
                        <span>{crop}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 ml-1">
                          Custom
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button
              onClick={onStart}
              className="bg-success hover:bg-success/90 text-success-foreground gap-2 font-mono text-xs"
            >
              <Play className="w-4 h-4" />
              INIT_FSM
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              className="gap-2 font-mono text-xs"
            >
              <Square className="w-4 h-4" />
              SAFE_STOP
            </Button>
          )}
          <Button
            onClick={onReset}
            variant="outline"
            className="gap-2 border-border hover:bg-secondary"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Demo Mode Overrides */}
      <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-warning/20">
              <Sliders className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">DEMO OVERRIDE SYSTEM</p>
              <p className="text-[10px] text-muted-foreground italic">Manual Water Control</p>
            </div>
          </div>
          <Badge variant="outline" className={`font-mono text-[10px] ${manualWaterLevel !== null ? 'bg-primary/10 text-primary border-primary/30' : 'text-muted-foreground'}`}>
            {manualWaterLevel !== null ? 'SIMULATION_ACTIVE' : 'HARDWARE_SYNC'}
          </Badge>
        </div>

        {/* Water Level Slider ONLY */}
        <div className="max-w-2xl flex items-center gap-4 bg-secondary/30 p-2 rounded-lg border border-border/50">
          <Droplet className={`w-4 h-4 ${manualWaterLevel !== null ? 'text-primary fill-primary animate-pulse' : 'text-muted-foreground'}`} />
          <div className="flex-1">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-muted-foreground">Manual Water Tank Level</span>
              <span className={`font-mono font-bold ${manualWaterLevel !== null ? 'text-primary' : 'text-muted-foreground'}`}>
                {manualWaterLevel !== null ? `${manualWaterLevel.toFixed(1)}%` : 'AUTO'}
              </span>
            </div>
            <Slider
              value={[manualWaterLevel ?? 50]}
              max={100}
              step={0.5}
              onValueChange={(vals) => setManualWaterLevel(vals[0])}
              className="py-1"
            />
          </div>
          {manualWaterLevel !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualWaterLevel(null)}
              className="h-7 text-[10px] border-primary/30 text-primary hover:bg-primary/10"
            >
              Back to Sensor
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
