<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { io, Socket } from 'socket.io-client'

type Telemetry = {
  deviceId: string
  voltage: string
  current: string
  power: string
  timestamp: number | string

  online?: boolean
  lastSeen?: number
}

const devices = ref<Record<string, Telemetry>>({})
const selectedDeviceId = ref<string | null>(null)

let socket: Socket
let statusTimer: number

onMounted(() => {
  socket = io('http://localhost:3000')

  socket.on('telemetry', (data: Telemetry) => {
    devices.value[data.deviceId] = {
      ...data,
      online: true,
      lastSeen: Date.now(),
    }

    if (!selectedDeviceId.value) {
      selectedDeviceId.value = data.deviceId;
    }
  })

  statusTimer = window.setInterval(() => {
    Object.values(devices.value).forEach((device) => {
      if (!device.lastSeen) return

      const diff = Date.now() - device.lastSeen

      if (diff > 5000) {
        device.online = false
      }
    })
  }, 5000)
})

onUnmounted(() => {
  socket.disconnect()
  clearInterval(statusTimer);
})

const selectedDevice = computed(() => {
  if (!selectedDeviceId.value) return null;
  return devices.value[selectedDeviceId.value];
})
</script>

<template>
  <main>
    <h1>IoT Device Dashboard</h1>
      <aside>
        <h2>Devices</h2>
  
        <button
          v-for="device in Object.values(devices)"
          :key="device.deviceId"
          @click="selectedDeviceId = device.deviceId"
        >Meter {{  device.deviceId }}</button>
      </aside>
  
      <section v-if="selectedDevice">
        <p>Voltage: {{ selectedDevice.voltage ?? '-' }}</p>
        <p>Current: {{ selectedDevice.current ?? '-' }}</p>
        <p>Power: {{ selectedDevice.power ?? '-' }}</p>
        <p>Temperature: {{ selectedDevice.power ?? '-' }}</p>
        <p>Timestamp: {{ new Date(selectedDevice.timestamp).toLocaleString() }}</p>
        <p>Online: {{ selectedDevice.online }}</p>
      </section>
  </main>
</template>

<style scoped>
</style>