const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://localhost:1883')

client.on('connect', () => {
  console.log('Simulator connected to MQTT broker')

  setInterval(() => {
    const data = {
      voltage: (220 + Math.random() * 10).toFixed(2),
      current: (5 + Math.random() * 2).toFixed(2),
      power: (1000 + Math.random() * 300).toFixed(2),
      timestamp: Date.now()
    }
    const alertData = {
      temperature: (110 + Math.random() * 10).toFixed(2),
      abb: (5 + Math.random() * 2).toFixed(2),
      mte: (1000 + Math.random() * 300).toFixed(2),
      timestamp: Date.now()
    }

    client.publish(
      'meter/001/telemetry',
      JSON.stringify(data)
    )

    client.publish(
      'meter/001/alert',
      JSON.stringify(alertData)
    )

    console.log('Published:', data)
    console.log('Published:', alertData)
  }, 2000)
})