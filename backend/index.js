const db = require('./db')
const express = require("express");
const http = require("http");
const mqtt = require("mqtt");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173'
  },
})

function validateTelemetry(data) {
  if (!data.deviceId) {
    return 'Missing deviceId'
  }

  if (typeof data.voltage !== 'number' || !Number.isFinite(data.voltage)) {
    return 'Invalid voltage'
  }

  if (typeof data.current !== 'number' || !Number.isFinite(data.current)) {
    return 'Invalid current'
  }

  if (typeof data.power !== 'number' || !Number.isFinite(data.power)) {
    return 'Invalid power'
  }

  return null
}

const mqttClient = mqtt.connect('mqtt://localhost:1883')
const TELEMETRY_QOS = 0
const STATUS_QOS = 1
const ALERT_QOS = 1

mqttClient.on('connect', () => {
  console.log('backend connected to MQTT broker')
  mqttClient.subscribe('meter/+/telemetry', {
    qos: TELEMETRY_QOS,
  })
  mqttClient.subscribe('meter/+/status', {
    qos: STATUS_QOS,
  })
  mqttClient.subscribe('meter/+/alert', {
    qos: ALERT_QOS,
  })
})

mqttClient.on('message', (topic, message) => {

  try {
    const data = JSON.parse(message.toString())
    const [, deviceId, messageType] = topic.split('/')
  
    if (messageType === "telemetry") {
      const telemetry = {
        ...data,
        deviceId,
      }
      const error = validateTelemetry(telemetry)
    
      if (error) {
        console.error('Validation error: ', error)
        return
      }
    
      console.log('Received MQTT telemetry:', telemetry)
      io.emit('telemetry', telemetry)
  
      db.run(
        `
        INSERT INTO telemetry (
          deviceId,
          voltage,
          current,
          power,
          timestamp
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          telemetry.deviceId,
          telemetry.voltage,
          telemetry.current,
          telemetry.power,
          telemetry.timestamp,
        ]
      )

      return
    }
    if (messageType === 'status') {
      const status = {
        ...data,
        deviceId,
      }
      console.log('Received MQTT status:', status)
      io.emit('device-status', status)
      return
    }
    if (messageType === 'alert') {
      const alert = {
        ...data,
        deviceId,
      }
      console.log('Received MQTT alert:', alert)
      io.emit('device-alert', alert)
      return
    }
  } catch (err) {
    console.error('Failed to process MQTT message:', err.message)
  }
})

app.get('/', (req, res) => {
  res.send('IoT backend is running')
})

app.get('/telemetry/:deviceId', (req, res) => {
  const { deviceId } = req.params

  db.all(
    `
    SELECT *
    FROM telemetry
    WHERE deviceId = ?
    ORDER BY timestamp DESC
    LIMIT 20
    `,
    [deviceId],
    (err, rows) => {
      if (err) {
        res.status(500).json({
          error: err.message,
        })
        return
      }

      res.json(rows.reverse())
    }
  )
})

server.listen(3000, () => {
  console.log('Backend running on http://localhost:3000')
})