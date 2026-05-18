const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://localhost:1883')

const devices = ['001', '002','003']

function createTelemetry(deviceId) {
  return {
    deviceId,
    voltage: (220 + Math.random() * 10).toFixed(2),
    current: (5 + Math.random() * 2).toFixed(2),
    power: (1000 + Math.random() * 300).toFixed(2),
    timestamp: Date.now()
  }
}

client.on('connect', () => {
  console.log('Simulator connected to MQTT broker')

  setInterval(() => {
    devices.forEach(deviceId => {
      const data = createTelemetry(deviceId)
      const topic = `meter/${deviceId}/telemetry`

      client.publish(topic, JSON.stringify(data))

      console.log(`Published to ${topic}:`, data)
    });
  }, 2000);
})