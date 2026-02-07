import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Usb, 
  Wifi, 
  WifiOff, 
  Activity,
  Cpu,
  Radio,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { HardwareStatus } from '@/hooks/useHardwareLink';
import { cn } from '@/lib/utils';

interface HardwarePanelProps {
  status: HardwareStatus;
  isSupported: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function HardwarePanel({
  status,
  isSupported,
  onConnect,
  onDisconnect,
}: HardwarePanelProps) {
  const getConnectionStatusColor = () => {
    if (status.isConnecting) return 'bg-warning/20 text-warning border-warning/30';
    if (status.isConnected) return 'bg-success/20 text-success border-success/30';
    return 'bg-muted/20 text-muted-foreground border-border/50';
  };

  const getConnectionIcon = () => {
    if (status.isConnecting) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status.isConnected) return <Wifi className="w-4 h-4" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const timeSinceLastData = status.lastDataReceived
    ? Math.round((Date.now() - status.lastDataReceived) / 1000)
    : null;

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Usb className="w-5 h-5 text-primary" />
          Hardware Link
          <Badge 
            variant="outline" 
            className={cn('ml-auto', getConnectionStatusColor())}
          >
            {getConnectionIcon()}
            <span className="ml-1.5">
              {status.isConnecting ? 'Connecting...' : status.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Browser Support Check */}
        {!isSupported && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Web Serial API not supported</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please use Chrome, Edge, or Opera browser
            </p>
          </div>
        )}

        {/* Connection Controls */}
        {isSupported && (
          <div className="flex gap-2">
            {!status.isConnected ? (
              <Button
                onClick={onConnect}
                disabled={status.isConnecting}
                className="flex-1 gap-2"
              >
                {status.isConnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Usb className="w-4 h-4" />
                )}
                {status.isConnecting ? 'Connecting...' : 'Connect ESP8266'}
              </Button>
            ) : (
              <Button
                onClick={onDisconnect}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <WifiOff className="w-4 h-4" />
                Disconnect
              </Button>
            )}
          </div>
        )}

        {/* Error Display */}
        {status.errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="break-words">{status.errorMessage}</span>
            </div>
          </div>
        )}

        {/* Connection Details */}
        {status.isConnected && (
          <>
            <Separator />
            
            <div className="space-y-3">
              {/* Port Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Cpu className="w-4 h-4" />
                  <span>Port</span>
                </div>
                <span className="text-sm font-mono">{status.portName || 'Unknown'}</span>
              </div>

              {/* Data Rate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-4 h-4" />
                  <span>Data Rate</span>
                </div>
                <span className="text-sm font-mono text-primary">
                  {status.dataRate} readings/sec
                </span>
              </div>

              {/* Last Data Received */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Radio className="w-4 h-4" />
                  <span>Last Data</span>
                </div>
                <span className={cn(
                  "text-sm font-mono",
                  timeSinceLastData !== null && timeSinceLastData > 3 ? "text-warning" : "text-success"
                )}>
                  {timeSinceLastData !== null ? (
                    timeSinceLastData === 0 ? 'Just now' : `${timeSinceLastData}s ago`
                  ) : (
                    'Waiting...'
                  )}
                </span>
              </div>

              {/* Connection Quality */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm">Live sensor data active</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Real sensor readings are replacing simulated data
                </p>
              </div>
            </div>
          </>
        )}

        {/* Hardware Setup Guide */}
        {!status.isConnected && isSupported && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">ESP8266 Setup</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>1. Connect ESP8266 via USB cable</p>
                <p>2. Ensure firmware sends JSON at 115200 baud:</p>
                <code className="block p-2 rounded bg-secondary/50 font-mono text-[10px] mt-1">
                  {`{"soilMoisture":55,"temperature":22,"humidity":58,"waterLevel":75}`}
                </code>
                <p className="mt-2">3. Click "Connect ESP8266" above</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
