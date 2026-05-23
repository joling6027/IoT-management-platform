const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://localhost:1883')

const devices = [
  {
    id: "001",
    online: true,
    nextStatusChangeAt: Date.now() + 10000,
  },
  {
    id: "002",
    online: true,
    nextStatusChangeAt: Date.now() + 15000,
  },
  {
    id: "003",
    online: true,
    nextStatusChangeAt: Date.now() + 20000,
  },
]

function createTelemetry(deviceId) {
  return {
    deviceId,
    voltage: (220 + Math.random() * 10).toFixed(2),
    current: (5 + Math.random() * 2).toFixed(2),
    power: (1000 + Math.random() * 300).toFixed(2),
    timestamp: Date.now()
  }
}

function publishTelemetry(device) {
  const data = createTelemetry(device.id)
  const topic = `meter/${device.id}/telemetry`

  client.publish(topic, JSON.stringify(data))

  console.log(`Published to ${topic}:`, data)
}

function publishStatus(device) {
  const status = {
    deviceId: device.id,
    status: device.online ? "online": "offline",
    timestamp: Date.now()
  }
  const topic = `meter/${device.id}/status`

  client.publish(topic, JSON.stringify(status))

  console.log(`Published to ${topic}:`, status)
}

function maybeChangeDeviceStatus(device) {
  if (Date.now() < device.nextStatusChangeAt) return

  device.online = !device.online

  publishStatus(device)

  const nextDelay = device.online
    ? 15000 + Math.random() * 15000
    : 5000 + Math.random() * 10000

  device.nextStatusChangeAt = Date.now() + nextDelay
}

client.on('connect', () => {
  console.log('Simulator connected to MQTT broker')

  setInterval(() => {
    devices.forEach(device => {
      publishStatus(device)
      maybeChangeDeviceStatus(device)

      if (device.online) {
        publishTelemetry(device)
      }
    });
  }, 2000);
})