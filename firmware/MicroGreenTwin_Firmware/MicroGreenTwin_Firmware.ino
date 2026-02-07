/*
 * MicroGreenTwin - Automated FSM Control System Firmware
 * Board: ESP8266 (NodeMCU 1.0) or ESP32 Dev Module
 * 
 * Features:
 * - Reads Soil Moisture (Analog)
 * - Reads Temp/Humidity (DHT11/22)
 * - Controls Water Pump (Relay)
 * - Reads Water Level (Ultrasonic HC-SR04)
 * - Sends Telemetry via Serial (JSON)
 * - Receives Commands via Serial (PUMP_ON/PUMP_OFF)
 */

#include "DHT.h"

// --- PIN CONFIGURATION ---
#define PIN_PUMP        5   // D1 (GPIO 5)  -> Relay Module
#define PIN_DHT         4   // D2 (GPIO 4)  -> DHT11 Data Pin
#define PIN_MOISTURE    A0  // A0 (ADC 0)   -> Capacitive Soil Sensor

// Ultrasonic Sensor Pins
#define PIN_TRIG        12  // D6 (GPIO 12) -> HC-SR04 Trig
#define PIN_ECHO        13  // D7 (GPIO 13) -> HC-SR04 Echo
#define MAX_DISTANCE    200 // Max distance in cm

// --- SENSOR SETTINGS ---
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

// --- TANK CONFIGURATION ---
const int TANK_HEIGHT_CM = 20; 
const int SENSOR_GAP_CM = 2;   

// --- STATE VARIABLES ---
bool pumpState = false;
unsigned long lastReadTime = 0;
const long READ_INTERVAL = 1000; // 1-second real-time telemetry

// Pulse Control
unsigned long pulseStartTime = 0;
unsigned long pulseDuration = 0;
bool pulseActive = false;

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_TRIG, OUTPUT); // Ensure Trig is output
  pinMode(PIN_ECHO, INPUT);  // Ensure Echo is input
  
  digitalWrite(PIN_PUMP, HIGH); // Start OFF
  digitalWrite(PIN_TRIG, LOW);  // Start LOW
  
  dht.begin();
}

void loop() {
  handleSerialCommands();
  handlePulseControl();
  sendTelemetry();
}

void handlePulseControl() {
  if (pulseActive) {
    if (millis() - pulseStartTime >= pulseDuration) {
      digitalWrite(PIN_PUMP, HIGH);
      pumpState = false;
      pulseActive = false;
    }
  }
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "PUMP_ON") {
      pulseActive = false;
      pumpState = true;
      digitalWrite(PIN_PUMP, LOW);
    } 
    else if (command == "PUMP_OFF") {
      pulseActive = false;
      pumpState = false;
      digitalWrite(PIN_PUMP, HIGH);
    }
    else if (command.startsWith("PUMP_PULSE:")) {
      int duration = command.substring(11).toInt();
      if (duration > 0) {
        pulseDuration = duration;
        pulseStartTime = millis();
        pulseActive = true;
        pumpState = true;
        digitalWrite(PIN_PUMP, LOW);
      }
    }
  }
}

void sendTelemetry() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentMillis;

    // 1. Manual Ultrasonic Ping
    digitalWrite(PIN_TRIG, LOW);
    delayMicroseconds(2);
    digitalWrite(PIN_TRIG, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIG, LOW);

    long duration = pulseIn(PIN_ECHO, HIGH, 30000); // 30ms timeout
    int distance = duration * 0.034 / 2;
    
    // Calculate Water Level %
    int waterLevelPct = 0;
    if (distance > 0 && distance < MAX_DISTANCE) {
      int waterHeight = TANK_HEIGHT_CM - distance;
      waterLevelPct = map(waterHeight, 0, TANK_HEIGHT_CM - SENSOR_GAP_CM, 0, 100);
      waterLevelPct = constrain(waterLevelPct, 0, 100);
    }

    // 2. Read Climate
    float h = dht.readHumidity();
    float t = dht.readTemperature();
    
    // 3. Read Moisture
    int rawM = analogRead(PIN_MOISTURE);
    int mPct = map(rawM, 800, 400, 0, 100); 
    mPct = constrain(mPct, 0, 100);

    // 4. Send JSON
    Serial.print("{\"soilMoisture\":");
    Serial.print(mPct);
    Serial.print(",\"temperature\":");
    Serial.print(isnan(t) ? 25.0 : t);
    Serial.print(",\"humidity\":");
    Serial.print(isnan(h) ? 50.0 : h);
    Serial.print(",\"waterLevel\":");
    Serial.print(waterLevelPct);
    Serial.print(",\"motorStatus\":\"");
    Serial.print(pumpState ? "ON" : "OFF");
    Serial.println("\"}");
    
    // Debug info for the user in Serial Monitor
    if (distance == 0) {
      // Serial.println("DEBUG: No echo received - check Echo wire or power!");
    }
  }
}
