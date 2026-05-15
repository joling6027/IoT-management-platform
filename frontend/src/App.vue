<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'

type Telemetry = {
  voltage?: string
  current?: string
  power?: string
  temperature?: string
  abb?: string
  mte?: string
  timestamp: number
}

const telemetry = ref<Telemetry | null>(null)
let socket: Socket

onMounted(() => {
  socket = io('http://localhost:3000')

  socket.on('telemetry', (data: Telemetry) => {
    telemetry.value = data
    console.log('Received telemetry:', data)
  })
})

onUnmounted(() => {
  socket.disconnect()
})
</script>

<template>
  <main>
    <h1>IoT Device Dashboard</h1>

    <section v-if="telemetry">
      <p>Voltage: {{ telemetry.voltage ?? '-' }}</p>
      <p>Current: {{ telemetry.current ?? '-' }}</p>
      <p>Power: {{ telemetry.power ?? '-' }}</p>
      <p>Temperature: {{ telemetry.temperature ?? '-' }}</p>
      <p>Timestamp: {{ new Date(telemetry.timestamp).toLocaleString() }}</p>
    </section>

    <p v-else>Waiting for telemetry...</p>
  </main>
</template>