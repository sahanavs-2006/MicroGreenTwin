import { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFSMEngine } from '@/hooks/useFSMEngine';
import { useDigitalTwin } from '@/hooks/useDigitalTwin';
import { useHardwareLink } from '@/hooks/useHardwareLink';
import { CROP_PROFILES, CropProfile, CropType, SensorData, TwinPrediction } from '@/types/agriculture';
import { getAvailableCrops, getCropProfile } from '@/lib/AdvancedCropProfiles';

import { ControlPanel } from './ControlPanel';
import { StateIndicator } from './StateIndicator';
import { SensorPanel } from './SensorPanel';
import { ActuatorStatus } from './ActuatorStatus';
import { PredictionChart } from './PredictionChart';
import { ClimateStability } from './ClimateStability';
import { DigitalTwinView } from './DigitalTwinView';
import { StateTimeline } from './StateTimeline';
import { FaultInjectionPanel } from './FaultInjectionPanel';
import { HardwarePanel } from './HardwarePanel';
import { SettingsPanel } from './SettingsPanel';
import { AdvancedControlPanel } from './AdvancedControlPanel';

import { Activity, Brain, AlertTriangle, Usb, Settings } from 'lucide-react';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('realtime');
  const [customProfiles, setCustomProfiles] = useState<Record<string, CropProfile>>({});
  const lastPredictionRef = useRef<TwinPrediction | undefined>(undefined);

  const {
    fsmState,
    sensorData,
    actuatorState,
    config,
    faultInjection,
    transitionHistory,
    isRunning,
    cycleCount,
    start,
    stop,
    reset,
    updateConfig,
    injectFault,
    handleHardwareData: fsmHandleHardwareData,
    validationMetrics,
    pumpDurationScheduled,
    manualWaterLevel,
    manualMoisture,
    setManualWaterLevel,
    setManualMoisture,
  } = useFSMEngine(customProfiles, lastPredictionRef);

  // Hardware link callback
  const handleHardwareData = useCallback((data: Partial<SensorData>) => {
    fsmHandleHardwareData(data);
  }, [fsmHandleHardwareData]);

  const {
    status: hardwareStatus,
    isSupported: hardwareSupported,
    connect: connectHardware,
    disconnect: disconnectHardware,
    setPumpState,
    pulsePump,
  } = useHardwareLink(handleHardwareData);

  const { prediction, syncStatus } = useDigitalTwin(
    sensorData,
    config.selectedCrop,
    isRunning,
    customProfiles
  );

  // Track if pulse was sent for current WATER_TRAY cycle
  const lastStateRef = useRef<string>('IDLE');

  // Sync prediction to ref for FSM access
  useEffect(() => {
    lastPredictionRef.current = prediction;
  }, [prediction]);

  // Synchronize Hardware Actuators with FSM Engine
  useEffect(() => {
    if (!hardwareStatus.isConnected) return;

    if (fsmState === 'WATER_TRAY' && lastStateRef.current !== 'WATER_TRAY') {
      // Entering WATER_TRAY: Send pulse to hardware
      const durationMs = pumpDurationScheduled * 1000;
      if (durationMs > 0) {
        pulsePump(durationMs);
      } else {
        setPumpState(true);
      }
    } else if (fsmState !== 'WATER_TRAY' && lastStateRef.current === 'WATER_TRAY') {
      // Leaving WATER_TRAY: Ensure pump is OFF (safety)
      setPumpState(false);
    }

    lastStateRef.current = fsmState;
  }, [fsmState, hardwareStatus.isConnected, pumpDurationScheduled, pulsePump, setPumpState]);

  // Get crop profile (built-in or custom)
  // Check advanced profiles first
  const activeAdvancedProfile = getCropProfile(config.selectedCrop);
  const allProfiles = { ...CROP_PROFILES, ...customProfiles };
  const cropProfile = activeAdvancedProfile || allProfiles[config.selectedCrop] || CROP_PROFILES.Mustard;

  // Custom profile handlers
  const handleAddCustomProfile = useCallback((name: string, profile: CropProfile) => {
    setCustomProfiles(prev => ({ ...prev, [name]: profile }));
  }, []);

  const handleRemoveCustomProfile = useCallback((name: string) => {
    setCustomProfiles(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
    // Reset to default crop if current was deleted
    if (config.selectedCrop === name) {
      updateConfig({ selectedCrop: 'Mustard' as CropType });
    }
  }, [config.selectedCrop, updateConfig]);

  // Extended crop list for control panel
  const allCropTypes = Array.from(new Set([
    ...getAvailableCrops(),
    ...Object.keys(CROP_PROFILES),
    ...Object.keys(customProfiles),
  ])) as string[];

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Control Panel */}
        <ControlPanel
          isRunning={isRunning}
          config={config}
          onStart={start}
          onStop={stop}
          onReset={reset}
          onConfigChange={updateConfig}
          customCrops={Object.keys(customProfiles)}
          hardwareConnected={hardwareStatus.isConnected}
          manualWaterLevel={manualWaterLevel}
          manualMoisture={manualMoisture}
          setManualWaterLevel={setManualWaterLevel}
          setManualMoisture={setManualMoisture}
        />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full bg-secondary/50 p-1 select-none overflow-x-auto">
            <TabsTrigger
              value="realtime"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">System Status</span>
            </TabsTrigger>
            <TabsTrigger
              value="twin"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Adaptive Twin</span>
            </TabsTrigger>
            <TabsTrigger
              value="faults"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Reliability Lab</span>
            </TabsTrigger>
            <TabsTrigger
              value="hardware"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium"
            >
              <Usb className="w-4 h-4" />
              <span className="hidden sm:inline">Hard-Link I/O</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs font-medium"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config Registers</span>
            </TabsTrigger>
          </TabsList>

          {/* Real-Time Tab */}
          <TabsContent value="realtime" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                <StateIndicator
                  state={fsmState}
                  isRunning={isRunning}
                  cycleCount={cycleCount}
                />
                <ClimateStability
                  prediction={prediction}
                  cropProfile={cropProfile}
                />
                <ActuatorStatus actuatorState={actuatorState} />
                <AdvancedControlPanel
                  validationMetrics={validationMetrics}
                  pumpDurationScheduled={pumpDurationScheduled}
                  manualWaterLevel={manualWaterLevel}
                  setManualWaterLevel={setManualWaterLevel}
                />
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3 space-y-4">
                <SensorPanel
                  sensorData={sensorData}
                  cropProfile={cropProfile}
                />
                <PredictionChart prediction={prediction} />
                <StateTimeline
                  currentState={fsmState}
                  transitionHistory={transitionHistory}
                />
              </div>
            </div>
          </TabsContent>

          {/* Digital Twin Tab */}
          <TabsContent value="twin" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DigitalTwinView
                prediction={prediction}
                syncStatus={syncStatus}
                sensorData={sensorData}
              />
              <div className="space-y-4">
                <PredictionChart prediction={prediction} />
                <ClimateStability
                  prediction={prediction}
                  cropProfile={cropProfile}
                />
                <AdvancedControlPanel
                  validationMetrics={validationMetrics}
                  pumpDurationScheduled={pumpDurationScheduled}
                  manualWaterLevel={manualWaterLevel}
                  setManualWaterLevel={setManualWaterLevel}
                />
              </div>
            </div>
          </TabsContent>

          {/* Fault Lab Tab */}
          <TabsContent value="faults" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FaultInjectionPanel
                faultInjection={faultInjection}
                onInjectFault={injectFault}
                isRunning={isRunning}
              />
              <div className="space-y-4">
                <StateIndicator
                  state={fsmState}
                  isRunning={isRunning}
                  cycleCount={cycleCount}
                />
                <StateTimeline
                  currentState={fsmState}
                  transitionHistory={transitionHistory}
                />
                <ActuatorStatus actuatorState={actuatorState} />
              </div>
            </div>
          </TabsContent>

          {/* Hardware Tab */}
          <TabsContent value="hardware" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HardwarePanel
                status={hardwareStatus}
                isSupported={hardwareSupported}
                onConnect={connectHardware}
                onDisconnect={disconnectHardware}
              />
              <div className="space-y-4">
                <SensorPanel
                  sensorData={sensorData}
                  cropProfile={cropProfile}
                />
                <ActuatorStatus actuatorState={actuatorState} />
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SettingsPanel
                config={config}
                onConfigChange={updateConfig}
                customProfiles={customProfiles}
                onAddCustomProfile={handleAddCustomProfile}
                onRemoveCustomProfile={handleRemoveCustomProfile}
              />
              <div className="space-y-4">
                <StateIndicator
                  state={fsmState}
                  isRunning={isRunning}
                  cycleCount={cycleCount}
                />
                <SensorPanel
                  sensorData={sensorData}
                  cropProfile={cropProfile}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
