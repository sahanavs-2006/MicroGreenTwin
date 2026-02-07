/// <reference types="w3c-web-serial" />

import { useState, useCallback, useRef, useEffect } from 'react';
import { SensorData } from '@/types/agriculture';

export interface HardwareStatus {
  isConnected: boolean;
  isConnecting: boolean;
  portName: string | null;
  lastDataReceived: number | null;
  errorMessage: string | null;
  dataRate: number; // readings per second
}

interface SerialPayload {
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;
  waterLevel?: number;
  motorStatus?: 'ON' | 'OFF';
}

const BAUD_RATE = 115200;
const READ_TIMEOUT = 5000; // 5 seconds without data = connection lost

export function useHardwareLink(onSensorData: (data: Partial<SensorData>) => void) {
  const [status, setStatus] = useState<HardwareStatus>({
    isConnected: false,
    isConnecting: false,
    portName: null,
    lastDataReceived: null,
    errorMessage: null,
    dataRate: 0,
  });

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const readLoopRef = useRef<boolean>(false);
  const dataCountRef = useRef<number>(0);
  const lastRateCheckRef = useRef<number>(Date.now());
  const onSensorDataRef = useRef(onSensorData);

  // Sync ref with current callback
  useEffect(() => {
    onSensorDataRef.current = onSensorData;
  }, [onSensorData]);

  // Check if Web Serial is supported
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Parse incoming JSON data from ESP8266
  const parseSerialData = useCallback((jsonStr: string): SerialPayload | null => {
    try {
      const data = JSON.parse(jsonStr.trim());
      return {
        soilMoisture: typeof data.soilMoisture === 'number' ? data.soilMoisture : undefined,
        temperature: typeof data.temperature === 'number' ? data.temperature : undefined,
        humidity: typeof data.humidity === 'number' ? data.humidity : undefined,
        waterLevel: typeof data.waterLevel === 'number' ? data.waterLevel : undefined,
        motorStatus: data.motorStatus === 'ON' || data.motorStatus === 'OFF' ? data.motorStatus : undefined,
      };
    } catch {
      return null;
    }
  }, []);

  // Read loop for serial data
  const startReadLoop = useCallback(async () => {
    if (!portRef.current?.readable) return;

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      readerRef.current = portRef.current.readable.getReader();
      readLoopRef.current = true;

      while (readLoopRef.current && readerRef.current) {
        const { value, done } = await readerRef.current.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            const parsed = parseSerialData(line);
            if (parsed) {
              const sensorData: Partial<SensorData> = {
                soilMoisture: parsed.soilMoisture,
                temperature: parsed.temperature,
                humidity: parsed.humidity,
                waterLevel: parsed.waterLevel,
                timestamp: Date.now(),
              };

              onSensorDataRef.current(sensorData);
              dataCountRef.current++;

              setStatus(prev => ({
                ...prev,
                lastDataReceived: Date.now(),
                errorMessage: null,
              }));
            }
          }
        }

        // Calculate data rate every second
        const now = Date.now();
        if (now - lastRateCheckRef.current >= 1000) {
          setStatus(prev => ({
            ...prev,
            dataRate: dataCountRef.current,
          }));
          dataCountRef.current = 0;
          lastRateCheckRef.current = now;
        }
      }
    } catch (error) {
      if (readLoopRef.current) {
        const message = error instanceof Error ? error.message : 'Read error';
        setStatus(prev => ({
          ...prev,
          errorMessage: message,
          isConnected: false,
        }));
      }
    } finally {
      if (readerRef.current) {
        readerRef.current.releaseLock();
        readerRef.current = null;
      }
    }
  }, [onSensorData, parseSerialData]);

  // Connect to serial port
  const connect = useCallback(async () => {
    if (!isSupported) {
      setStatus(prev => ({
        ...prev,
        errorMessage: 'Web Serial API not supported in this browser',
      }));
      return false;
    }

    setStatus(prev => ({ ...prev, isConnecting: true, errorMessage: null }));

    try {
      // Request port from user
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x1A86 }, // CH340 (common ESP8266 USB chip)
          { usbVendorId: 0x10C4 }, // CP210x
          { usbVendorId: 0x0403 }, // FTDI
        ],
      });

      // Open port
      await port.open({ baudRate: BAUD_RATE });

      portRef.current = port;

      // Get port info
      const info = port.getInfo();
      const portName = info.usbVendorId
        ? `USB Device (${info.usbVendorId.toString(16)}:${info.usbProductId?.toString(16) || '0000'})`
        : 'Serial Port';

      setStatus({
        isConnected: true,
        isConnecting: false,
        portName,
        lastDataReceived: null,
        errorMessage: null,
        dataRate: 0,
      });

      // Start reading data
      startReadLoop();

      return true;
    } catch (error) {
      const message = error instanceof Error
        ? (error.name === 'NotFoundError' ? 'No port selected' : error.message)
        : 'Connection failed';

      setStatus(prev => ({
        ...prev,
        isConnecting: false,
        errorMessage: message,
      }));
      return false;
    }
  }, [isSupported, startReadLoop]);

  // Disconnect from serial port
  const disconnect = useCallback(async () => {
    readLoopRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {
        // Ignore cancel errors
      }
      readerRef.current = null;
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        // Ignore close errors
      }
      portRef.current = null;
    }

    setStatus({
      isConnected: false,
      isConnecting: false,
      portName: null,
      lastDataReceived: null,
      errorMessage: null,
      dataRate: 0,
    });
  }, []);

  // Send command to ESP8266
  const sendCommand = useCallback(async (command: string) => {
    if (!portRef.current?.writable) {
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const writer = portRef.current.writable.getWriter();
      await writer.write(encoder.encode(command + '\n'));
      writer.releaseLock();
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Write error';
      setStatus(prev => ({ ...prev, errorMessage: message }));
      return false;
    }
  }, []);

  // Control pump via serial command
  const setPumpState = useCallback(async (active: boolean) => {
    return sendCommand(active ? 'PUMP_ON' : 'PUMP_OFF');
  }, [sendCommand]);

  // Pulse pump for duration
  const pulsePump = useCallback(async (ms: number) => {
    return sendCommand(`PUMP_PULSE:${ms}`);
  }, [sendCommand]);

  // Check for connection timeout
  useEffect(() => {
    if (!status.isConnected) return;

    const checkTimeout = setInterval(() => {
      if (status.lastDataReceived && Date.now() - status.lastDataReceived > READ_TIMEOUT) {
        setStatus(prev => ({
          ...prev,
          errorMessage: 'No data received - connection may be lost',
        }));
      }
    }, 1000);

    return () => clearInterval(checkTimeout);
  }, [status.isConnected, status.lastDataReceived]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      readLoopRef.current = false;
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => { });
      }
      if (portRef.current) {
        portRef.current.close().catch(() => { });
      }
    };
  }, []);

  return {
    status,
    isSupported,
    connect,
    disconnect,
    sendCommand,
    setPumpState,
    pulsePump,
  };
}
