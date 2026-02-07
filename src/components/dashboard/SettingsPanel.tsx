import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Droplets,
  Timer,
  Leaf,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  Activity
} from 'lucide-react';
import {
  SystemConfig,
  CropType,
  CropProfile,
  CROP_PROFILES,
  DEFAULT_CONFIG
} from '@/types/agriculture';
import { toast } from 'sonner';

interface SettingsPanelProps {
  config: SystemConfig;
  onConfigChange: (config: Partial<SystemConfig>) => void;
  customProfiles: Record<string, CropProfile>;
  onAddCustomProfile: (name: string, profile: CropProfile) => void;
  onRemoveCustomProfile: (name: string) => void;
}

export function SettingsPanel({
  config,
  onConfigChange,
  customProfiles,
  onAddCustomProfile,
  onRemoveCustomProfile,
}: SettingsPanelProps) {
  const [newCropName, setNewCropName] = useState('');
  const [newProfile, setNewProfile] = useState<CropProfile>({
    tempMin: 18,
    tempMax: 24,
    humidityMin: 45,
    humidityMax: 65,
    trayMoistureMin: 35,
    trayMoistureMax: 75,
  });

  const handleAddCrop = () => {
    if (!newCropName.trim()) {
      toast.error('Please enter a crop name');
      return;
    }

    if (CROP_PROFILES[newCropName as CropType] || customProfiles[newCropName]) {
      toast.error('A crop with this name already exists');
      return;
    }

    if (newProfile.trayMoistureMin >= newProfile.trayMoistureMax) {
      toast.error('Minimum moisture must be less than maximum');
      return;
    }

    onAddCustomProfile(newCropName, newProfile);
    setNewCropName('');
    setNewProfile({
      tempMin: 18,
      tempMax: 24,
      humidityMin: 45,
      humidityMax: 65,
      trayMoistureMin: 35,
      trayMoistureMax: 75,
    });
    toast.success(`Added custom profile: ${newCropName}`);
  };

  const handleResetDefaults = () => {
    onConfigChange({
      waterLevelMinimum: DEFAULT_CONFIG.waterLevelMinimum,
      stabilizationTime: DEFAULT_CONFIG.stabilizationTime,
      readInterval: DEFAULT_CONFIG.readInterval,
      daysSincePlanting: DEFAULT_CONFIG.daysSincePlanting,
      controlMode: DEFAULT_CONFIG.controlMode,
    });
    toast.success('Settings reset to defaults');
  };

  const allProfiles = { ...CROP_PROFILES, ...customProfiles };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="w-5 h-5 text-primary" />
          System Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="thresholds" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
            <TabsTrigger value="thresholds" className="gap-1.5 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              Thresholds
            </TabsTrigger>
            <TabsTrigger value="timing" className="gap-1.5 text-xs">
              <Timer className="w-3.5 h-3.5" />
              Timing
            </TabsTrigger>
            <TabsTrigger value="crops" className="gap-1.5 text-xs">
              <Leaf className="w-3.5 h-3.5" />
              Crops
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Water Level Minimum (%)</Label>
                  <span className="text-sm font-mono text-primary">
                    {config.waterLevelMinimum}%
                  </span>
                </div>
                <Slider
                  value={[config.waterLevelMinimum]}
                  onValueChange={([value]) => onConfigChange({ waterLevelMinimum: value })}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  System enters LOW_WATER_FAULT when tank drops below this level
                </p>
              </div>

              <Separator />

              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-info" />
                  Current Crop Thresholds
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Moisture Range:</span>
                    <span className="ml-2 font-mono text-primary">
                      {allProfiles[config.selectedCrop]?.trayMoistureMin ?? 35}% - {allProfiles[config.selectedCrop]?.trayMoistureMax ?? 75}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Temp Range:</span>
                    <span className="ml-2 font-mono text-foreground">
                      {allProfiles[config.selectedCrop]?.tempMin ?? 18}°C - {allProfiles[config.selectedCrop]?.tempMax ?? 24}°C
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Sensor Read Interval</Label>
                  <span className="text-sm font-mono text-primary">
                    {config.readInterval}ms
                  </span>
                </div>
                <Slider
                  value={[config.readInterval]}
                  onValueChange={([value]) => onConfigChange({ readInterval: value })}
                  min={500}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How often to read sensor data (500ms - 5000ms)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Stabilization Time (seconds)</Label>
                  <span className="text-sm font-mono text-primary">
                    {config.stabilizationTime}s
                  </span>
                </div>
                <Slider
                  value={[config.stabilizationTime]}
                  onValueChange={([value]) => onConfigChange({ stabilizationTime: value })}
                  min={3}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Time to wait in STABILIZE_ENV before transitioning to SAFE_MONITOR
                </p>
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="crops" className="space-y-4 mt-0">
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {Object.keys(customProfiles).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Custom Profiles</Label>
                    {Object.entries(customProfiles).map(([name, profile]) => (
                      <div
                        key={name}
                        className="p-3 rounded-lg bg-secondary/30 border border-border/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-success" />
                            <span className="font-medium">{name}</span>
                            <Badge variant="outline" className="text-xs">Custom</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              onRemoveCustomProfile(name);
                              toast.success(`Removed profile: ${name}`);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>Moisture: {profile.trayMoistureMin}-{profile.trayMoistureMax}%</div>
                          <div>Temp: {profile.tempMin}-{profile.tempMax}°C</div>
                          <div>Humidity: {profile.humidityMin}-{profile.humidityMax}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Custom Crop Profile
                  </Label>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Crop Name</Label>
                    <Input
                      value={newCropName}
                      onChange={(e) => setNewCropName(e.target.value)}
                      placeholder="e.g., Pea Shoots"
                      className="h-9"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Moisture Min ({newProfile.trayMoistureMin}%)
                      </Label>
                      <Slider
                        value={[newProfile.trayMoistureMin]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, trayMoistureMin: value }))
                        }
                        min={10}
                        max={60}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Moisture Max ({newProfile.trayMoistureMax}%)
                      </Label>
                      <Slider
                        value={[newProfile.trayMoistureMax]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, trayMoistureMax: value }))
                        }
                        min={50}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Temp Min ({newProfile.tempMin}°C)
                      </Label>
                      <Slider
                        value={[newProfile.tempMin]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, tempMin: value }))
                        }
                        min={10}
                        max={25}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Temp Max ({newProfile.tempMax}°C)
                      </Label>
                      <Slider
                        value={[newProfile.tempMax]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, tempMax: value }))
                        }
                        min={20}
                        max={35}
                        step={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Humidity Min ({newProfile.humidityMin}%)
                      </Label>
                      <Slider
                        value={[newProfile.humidityMin]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, humidityMin: value }))
                        }
                        min={30}
                        max={60}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Humidity Max ({newProfile.humidityMax}%)
                      </Label>
                      <Slider
                        value={[newProfile.humidityMax]}
                        onValueChange={([value]) =>
                          setNewProfile(prev => ({ ...prev, humidityMax: value }))
                        }
                        min={50}
                        max={90}
                        step={5}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleAddCrop}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <Save className="w-4 h-4" />
                    Add Crop Profile
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Control Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['REACTIVE', 'PREDICTIVE', 'HYBRID'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={config.controlMode === mode ? 'default' : 'outline'}
                      size="sm"
                      className="text-[10px] h-8"
                      onClick={() => onConfigChange({ controlMode: mode })}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {config.controlMode === 'REACTIVE' && 'Uses fixed thresholds and PID-lite for safety.'}
                  {config.controlMode === 'PREDICTIVE' && 'Uses Digital Twin forecast to pre-water.'}
                  {config.controlMode === 'HYBRID' && 'Blends forecast and reactive logic.'}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Days Since Planting</Label>
                  <span className="text-sm font-mono text-primary">
                    Day {config.daysSincePlanting}
                  </span>
                </div>
                <Slider
                  value={[config.daysSincePlanting]}
                  onValueChange={([value]) => onConfigChange({ daysSincePlanting: value })}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Determines the growth stage (Seedling, Vegetative, or Mature) and adjusts biological parameters.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
