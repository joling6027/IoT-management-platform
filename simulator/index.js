const mqtt = require('mqtt')
const readline = require('readline')

const MQTT_URL = 'mqtt://localhost:1883'
let randomStatusChanges = true

const devices = [
  {
    id: "001",
    online: true,
    nextStatusChangeAt: Date.now() + 10000,
    client: null,
  },
  {
    id: "002",
    online: true,
    nextStatusChangeAt: Date.now() + 15000,
    client: null,
  },
  {
    id: "003",
    online: true,
    nextStatusChangeAt: Date.now() + 20000,
    client: null,
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

  device.client.publish(topic, JSON.stringify(data))

  console.log(`Published to ${topic}:`, data)
}

function publishStatus(device) {
  const status = {
    deviceId: device.id,
    status: device.online ? "online": "offline",
    timestamp: Date.now()
  }
  const topic = `meter/${device.id}/status`

  device.client.publish(topic, JSON.stringify(status))

  console.log(`Published to ${topic}:`, status)
}

function getNextStatusDelay(device) {
  return device.online
    ? 15000 + Math.random() * 15000
    : 5000 + Math.random() * 10000
}

function scheduleNextStatusChange(device) {
  device.nextStatusChangeAt = Date.now() + getNextStatusDelay(device)
}

function connectDevice(device) {
  device.client = mqtt.connect(MQTT_URL, {
    clientId: `sim-meter-${device.id}`,
    will: {
      topic: `meter/${device.id}/status`,
      payload: JSON.stringify({
        deviceId: device.id,
        status: 'offline',
        reason: 'unexpected_disconnect',
        timestamp: Date.now(),
      }),
      qos: 1,
      retain: false,
    },
  })

  device.client.on('connect', () => {
    device.online = true
    console.log(`Meter ${device.id} connected to MQTT broker`)
    publishStatus(device)
  })

  device.client.on('error', (err) => {
    console.error(`Meter ${device.id} MQTT error:`, err.message)
  })
}

function setDeviceOnline(device) {
  if (device.online && device.client.connected) {
    console.log(`Meter ${device.id} is already online`)
    return
  }

  connectDevice(device)
  scheduleNextStatusChange(device)
}

function setDeviceOffline(device) {
  if (!device.online) {
    console.log(`Meter ${device.id} is already offline`)
    return
  }

  device.online = false
  publishStatus(device)
  device.client.end()
  scheduleNextStatusChange(device)
}

function maybeChangeDeviceStatus(device) {
  if (Date.now() < device.nextStatusChangeAt) return

  if (device.online) {
    setDeviceOffline(device)
  } else {
    setDeviceOnline(device)
  }
}

function findDevice(deviceId) {
  return devices.find(device => device.id === deviceId)
}

function printDeviceStatus() {
  devices.forEach(device => {
    console.log(
      `Meter ${device.id}: ${device.online ? 'online' : 'offline'}`
    )
  })
}

function printHelp() {
  console.log('Commands:')
  console.log('  status')
  console.log('  online <deviceId>')
  console.log('  offline <deviceId>')
  console.log('  random on')
  console.log('  random off')
  console.log('  help')
}

function handleCommand(input) {
  const [command, value] = input.trim().split(/\s+/)

  if (!command) return

  if (command === 'help') {
    printHelp()
    return
  }

  if (command === 'status') {
    printDeviceStatus()
    return
  }

  if (command === 'random') {
    randomStatusChanges = value !== 'off'
    console.log(`Random status changes: ${randomStatusChanges ? 'on' : 'off'}`)
    return
  }

  if (command === 'online' || command === 'offline') {
    const device = findDevice(value)

    if (!device) {
      console.log(`Unknown device: ${value}`)
      return
    }

    if (command === 'online') {
      setDeviceOnline(device)
    } else {
      setDeviceOffline(device)
    }

    return
  }

  console.log(`Unknown command: ${command}`)
  printHelp()
}

devices.forEach(device => {
  connectDevice(device)
})

setInterval(() => {
  devices.forEach(device => {
    if (randomStatusChanges) {
      maybeChangeDeviceStatus(device)
    }

    if (device.online && device.client.connected) {
      publishTelemetry(device)
    }
  });
}, 2000);

const commandLine = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

printHelp()

commandLine.on('line', handleCommand)
