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

const mqttClient = mqtt.connect('mqtt://localhost: 1883')

mqttClient.on('connect', () => {
  console.log('backend connected to MQTT broker')
  mqttClient.subscribe('meter/+/telemetry')
})

mqttClient.on('message', (topic, message) => {
  const data = JSON.parse(message.toString())
  const [, deviceId] = topic.split('/')

  const telemetry = {
    ...data,
    deviceId,
  }

  console.log('Received from MTQQ:', telemetry)
  io.emit('telemetry', telemetry)
})

app.get('/', (req, res) => {
  res.send('IoT backend is running')
})

server.listen(3000, () => {
  console.log('Backend running on http://localhost:3000')
})