<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { io, Socket } from "socket.io-client";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);

type Telemetry = {
  deviceId: string;
  voltage: string;
  current: string;
  power: string;
  timestamp: number | string;

  online?: boolean;
  lastSeen?: number;
  alert?: string;
  previousOnline?: boolean;
};

const devices = ref<Record<string, Telemetry>>({});
const selectedDeviceId = ref<string | null>(null);
const history = ref<Telemetry[]>([]);

let socket: Socket;
let statusTimer: number;

onMounted(() => {
  socket = io("http://localhost:3000");

  socket.on("telemetry", (data: Telemetry) => {
    const existingDevice = devices.value[data.deviceId]
    const alerts: string[] = [];
    const voltage = Number(data.voltage);
    const current = Number(data.current);
    const power = Number(data.power);

    if (existingDevice && existingDevice.online === false) {
      console.log(`${data.deviceId} RECONNECTED`)
    }

    if (voltage > 228) {
      alerts.push("High voltage");
    }

    if (voltage < 222) {
      alerts.push("Low voltage");
    }

    if (current > 6.5) {
      alerts.push("High current");
    }

    if (power > 1250) {
      alerts.push("High power");
    }

    devices.value[data.deviceId] = {
      ...data,
      online: true,
      alert: alerts.join(", "),
      lastSeen: Date.now(),
    };

    if (data.deviceId === selectedDeviceId.value) {
      history.value.push(data)

      if (history.value.length > 20) {
        history.value.shift() // keep the latest 20 records
      }
    }

    if (!selectedDeviceId.value) {
      selectedDeviceId.value = data.deviceId;
      loadHistory(data.deviceId);
      console.log(history.value);
    }
  });

  statusTimer = window.setInterval(() => {
    Object.values(devices.value).forEach((device) => {
      if (!device.lastSeen) return;

      const diff = Date.now() - device.lastSeen;

      if (diff > 5000) {
        device.previousOnline = device.online
        device.online = false

        console.log(`${device.deviceId} OFFLINE`)
      }
    });
  }, 5000);
});

onUnmounted(() => {
  socket.disconnect();
  clearInterval(statusTimer);
});

const selectedDevice = computed(() => {
  if (!selectedDeviceId.value) return null;
  return devices.value[selectedDeviceId.value];
});

const chartOption = computed(() => ({
  tooltip: {
    trigger: "axis",
  },
  legend: {
    data: ["Voltage", "Current", "Power"],
  },
  xAxis: {
    type: "category",
    data: history.value.map((item) =>
      new Date(item.timestamp).toLocaleTimeString(),
    ),
  },
  yAxis: [
    {
      type: "value",
      name: "Voltage (V)",
      position: "left",
    },
    {
      type: "value",
      name: "Current (A)",
      position: "right",
    },
    {
      type: "value",
      name: "Power (W)",
      position: "right",
      offset: 80,
    },
  ],
  series: [
    {
      name: "Voltage",
      type: "line",
      yAxisIndex: 0,
      data: history.value.map((item) => Number(item.voltage)),
    },
    {
      name: "Current",
      type: "line",
      yAxisIndex: 1,
      data: history.value.map((item) => Number(item.current)),
    },
    {
      name: "Power",
      type: "line",
      yAxisIndex: 2,
      data: history.value.map((item) => Number(item.power)),
    },
  ],
}));

async function loadHistory(deviceId: string) {
  const response = await fetch(`http://localhost:3000/telemetry/${deviceId}`);
  history.value = await response.json();
}

function selectDevice(deviceId: string) {
  selectedDeviceId.value = deviceId;
  loadHistory(deviceId);
}
</script>

<template>
  <main>
    <h1>IoT Device Dashboard</h1>
    <aside>
      <h2>Devices</h2>

      <button
        v-for="device in Object.values(devices)"
        :key="device.deviceId"
        @click="selectDevice(device.deviceId)"
      >
        Meter {{ device.deviceId }}
      </button>
    </aside>

    <section v-if="selectedDevice">
      <p>Voltage: {{ selectedDevice.voltage ?? "-" }}</p>
      <p>Current: {{ selectedDevice.current ?? "-" }}</p>
      <p>Power: {{ selectedDevice.power ?? "-" }}</p>
      <p>Temperature: {{ selectedDevice.power ?? "-" }}</p>
      <p>
        Timestamp: {{ new Date(selectedDevice.timestamp).toLocaleString() }}
      </p>
      <p>Online: {{ selectedDevice.online }}</p>
      <p>Alert: {{ selectedDevice.alert || "Normal" }}</p>

      <VChart
        v-if="history.length"
        :option="chartOption"
        style="height: 400px; width: 100%"
      />
    </section>
  </main>
</template>

<style scoped></style>
