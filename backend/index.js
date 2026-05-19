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

  if (isNaN(Number(data.voltage))) {
    return 'Invalid voltage'
  }

  if (isNaN(Number(data.current))) {
    return 'Invalid current'
  }

  return null
}

const mqttClient = mqtt.connect('mqtt://localhost:1883')

mqttClient.on('connect', () => {
  console.log('backend connected to MQTT broker')
  mqttClient.subscribe('meter/+/telemetry')
})

mqttClient.on('message', (topic, message) => {

  try {
    const data = JSON.parse(message.toString())
    const [, deviceId] = topic.split('/')
  
    const telemetry = {
      ...data,
      deviceId,
    }
    const error = validateTelemetry(telemetry)
  
    if (error) {
      console.error('Validation error: ', error)
      return
    }
  
    console.log('Received from MTQQ:', telemetry)
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