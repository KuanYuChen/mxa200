<!-- src/components/NxPlayerWithFix.vue -->
<template>
  <v-main>
    <div class="nx-media-player-container">
      <h2 class="title">Nx Witness 播放器 (列表修正版)</h2>

      <!-- 登入區塊 -->
      <div v-if="!token" class="login-form card">
        <h3>登入 Nx Server</h3>
        <div class="form-group">
          <label>Server IP</label>
          <input v-model="serverIp" placeholder="例如: 192.168.15.198" disabled />
        </div>
        <div class="form-group">
          <label>Port</label>
          <input v-model="port" placeholder="預設: 7001" disabled />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="username" placeholder="您的使用者名稱" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="您的密碼" />
        </div>
        <button @click="login" :disabled="isLoading" class="login-button">
          {{ isLoading ? '登入中...' : '登入並獲取攝影機' }}
        </button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>

      <!-- 播放器主體區塊 -->
      <div v-if="token && cameras.length > 0" class="player-section card">
        <div class="form-group">
          <label>選擇攝影機</label>
          <select v-model="selectedCameraId" @change="playVideoStream">
            <option disabled value="">-- 請選擇 --</option>
            <option v-for="camera in cameras" :key="camera.id" :value="camera.id">
              {{ camera.name }}
            </option>
          </select>
        </div>

        <div v-if="selectedCameraId">
          <div class="video-wrapper">
            <div v-if="isPlayerLoading" class="player-loader">
              <div class="spinner"></div>
              <span>正在載入影片...</span>
            </div>
            <video ref="videoPlayer" controls autoplay muted @error="handleVideoError"></video>
          </div>

          <div class="controls-panel">
            <div class="mode-switcher">
              <button @click="setMode('live')" :class="{ active: mode === 'live' }">即時影像 (Live)</button>
              <button @click="setMode('playback')" :class="{ active: mode === 'playback' }">影像回放 (Playback)</button>
            </div>
            <div v-if="mode === 'playback'" class="playback-controls">
              <div class="form-group">
                <label>回放日期</label>
                <v-date-picker v-model="playbackDate" @update:modelValue="onDateChange"></v-date-picker>
              </div>
              <div class="form-group">
                <label>時間軸 ({{ formatTime(playbackTime) }})</label>
                <div class="timeline-container">
                  <div class="timeline-background">
                    <div v-for="chunk in recordedChunks" :key="chunk.startTimeMs" class="recorded-chunk"
                      :style="getChunkStyle(chunk)"></div>
                  </div>
                  <input type="range" min="0" :max="SECONDS_IN_A_DAY - 1" v-model.number="playbackTime"
                    class="timeline-slider" @mouseup="playVideoStream" @touchend="playVideoStream" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 如果登入成功但沒有攝影機，顯示這個提示 -->
      <div v-if="token && cameras.length === 0 && !isLoading" class="card">
        <p class="error-message">{{ error || '登入成功，但未找到任何可用的攝影機設備。' }}</p>
      </div>

    </div>
  </v-main>
</template>

<script>
const SECONDS_IN_A_DAY = 24 * 60 * 60;

// *** 核心修正 1: 擴充已知的攝影機 typeId 列表 ***
const NX_CAMERA_TYPE_IDS = [
  'nx.vms.devices.camera',
  'com.networkoptix.vms.devices.camera', // 非常常見的變體
  'nx.vms.devices.virtual_camera',
  'nx.vms.devices.io_module',
  'nx.vms.devices.analog_camera'
];

export default {
  data() {
    return {
      serverIp: '192.168.15.198', // 顯示用，實際請求由代理處理
      port: '7001',
      username: 'admin',
      password: 'Jqtek90856322', // 建議從更安全的地方讀取
      token: null,
      cameras: [],
      selectedCameraId: '',
      isLoading: false,
      isFetchingChunks: false,
      isPlayerLoading: false,
      error: null,
      SECONDS_IN_A_DAY,
      mode: 'live',
      playbackDate: new Date(),
      playbackTime: 0,
      recordedChunks: [],
    };
  },

  methods: {
    async login() {
      this.isLoading = true; this.error = null;
      try {
        const response = await fetch('/rest-api-proxy/login/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.username, password: this.password }),
        });
        if (!response.ok) throw new Error(`登入失敗: ${response.status} ${response.statusText}`);
        const data = await response.json();
        this.token = data.token;
        await this.fetchCameras();
      } catch (err) {
        this.error = `${err.message}。請確認 Vite 代理設定正確。`;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCameras() {
      if (!this.token) return;
      try {
        const response = await fetch('/rest-api-proxy/devices', { headers: { 'Authorization': `Bearer ${this.token}` } });
        if (!response.ok) throw new Error('無法獲取設備列表');
        const allDevices = await response.json();
        console.log("????????", allDevices)
        // const filteredCameras = allDevices.filter(device => NX_CAMERA_TYPE_IDS.includes(device.typeId));

        // *** 核心修正 2: 增加安全網和除錯日誌 ***
        // if (filteredCameras.length === 0) {
        //   console.warn("警告：使用預設的 typeId 列表過濾後，未找到任何攝影機。");
        //   console.log("伺服器回傳的所有設備如下，請從中找到您的攝影機並將其 'typeId' 添加到 NX_CAMERA_TYPE_IDS 列表中：", allDevices);
        //   this.error = "系統中未找到可用的攝影機設備。請按 F12 打開控制台以獲取詳細的除錯資訊。";
        //   this.cameras = []; // 確保列表為空
        //   return; // 終止函式執行
        // }

        // this.cameras = filteredCameras.map(device => ({ id: device.id.replace(/^\{|\}$/g, ''), name: device.name }));
        this.cameras = allDevices.map(device => ({ id: device.id.replace(/^\{|\}$/g, ''), name: device.name }));
        console.log(this.cameras)
      } catch (err) {
        this.error = err.message;
      }
    },

    async fetchRecordedChunks() {
      // (此處使用之前修正過的 /rest-api-proxy/devices/.../recordedTime 版本)
      if (!this.selectedCameraId || !this.playbackDate) return;
      this.isFetchingChunks = true; this.recordedChunks = [];
      const date = new Date(this.playbackDate);
      const startTimeMs = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const endTimeMs = startTimeMs + (SECONDS_IN_A_DAY * 1000) - 1;
      try {
        const response = await fetch(
          `/rest-api-proxy/devices/${this.selectedCameraId}/recordedTime?periodStart=${startTimeMs}&periodEnd=${endTimeMs}`,
          { headers: { 'Authorization': `Bearer ${this.token}` } }
        );
        if (!response.ok) throw new Error('無法獲取錄影時間段');
        const data = await response.json();
        this.recordedChunks = data.map(period => ({ startTimeMs: period[0], durationMs: period[1] - period[0] }));
      } catch (err) {
        this.error = `獲取錄影數據失敗: ${err.message}`;
      } finally {
        this.isFetchingChunks = false;
      }
    },

    async getPlayableVideoUrl(cameraId, timestampMs = null) {
      if (!this.token) { this.error = "Token 不存在，無法獲取影片。"; return null; }
      let apiUrl = `/media-proxy/${cameraId}.webm`;
      if (timestampMs) {
        // 使用 pts (微秒) 進行回放
        apiUrl += `?pts=${timestampMs * 1000}&stream=0`;
      } else {
        // 即時播放時強制使用主要串流
        apiUrl += `?stream=0`;
      }
      console.log("?????????????????", apiUrl)
      this.isPlayerLoading = true; this.error = null;
      try {
        const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${this.token}` } });
        if (!response.ok) throw new Error(`無法獲取影片串流: ${response.status} ${response.statusText}`);
        const videoBlob = await response.blob();
        console.log("RESPONSE: ", videoBlob)
        if (videoBlob.size === 0) {
          throw new Error("伺服器回傳了空的影像資料，請檢查伺服器端轉碼或攝影機串流設定。");
        }
        return URL.createObjectURL(videoBlob);
      } catch (error) {
        this.error = error.message; return null;
      } finally {
        this.isPlayerLoading = false;
      }
    },

    async playVideoStream() {
      const videoElement = this.$refs.videoPlayer;
      if (!this.selectedCameraId) return;
      if (videoElement.src && videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoElement.src);
      }
      videoElement.src = '';
      const timestamp = this.mode === 'playback' ? this.getPlaybackTimestampMs() : null;
      const playableUrl = await this.getPlayableVideoUrl(this.selectedCameraId, timestamp);
      if (playableUrl) {
        videoElement.src = playableUrl;
        await videoElement.play().catch(e => console.error("播放失敗:", e));
      }
    },

    handleVideoError(event) {
      const error = event.target.error;
      if (error) { this.error = `影片播放錯誤: Code ${error.code}, ${error.message}`; }
    },

    async setMode(newMode) {
      this.mode = newMode;
      if (this.selectedCameraId) {
        if (newMode === 'playback') {
          await this.fetchRecordedChunks();
        }
        await this.playVideoStream();
      }
    },

    async onDateChange() {
      if (this.mode === 'playback') {
        await this.fetchRecordedChunks();
        await this.playVideoStream();
      }
    },

    getPlaybackTimestampMs() {
      const date = new Date(this.playbackDate);
      date.setHours(0, 0, 0, 0);
      return date.getTime() + (this.playbackTime * 1000);
    },

    formatTime(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
      const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    },

    getChunkStyle(chunk) {
      const dayStartMs = new Date(this.playbackDate).setHours(0, 0, 0, 0);
      const startOffsetMs = chunk.startTimeMs - dayStartMs;
      const leftPercentage = (startOffsetMs / (SECONDS_IN_A_DAY * 1000)) * 100;
      const widthPercentage = (chunk.durationMs / (SECONDS_IN_A_DAY * 1000)) * 100;
      return { left: `${leftPercentage}%`, width: `${Math.max(0.1, widthPercentage)}%` };
    },
  },

  beforeUnmount() {
    const videoElement = this.$refs.videoPlayer;
    if (videoElement && videoElement.src && videoElement.src.startsWith('blob:')) {
      URL.revokeObjectURL(videoElement.src);
    }
  },
};
</script>

<style scoped>
/* 所有 CSS 樣式與之前版本完全相同 */
.nx-media-player-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background-color: #f7f9fc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  color: #333;
  margin-bottom: 25px;
}

.card {
  background: #fff;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  font-weight: 600;
  color: #555;
  margin-bottom: 5px;
}

input,
select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 16px;
}

input:disabled {
  background-color: #e9ecef;
}

.login-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: #0056b3;
}

.login-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  margin-top: 15px;
  text-align: center;
  word-break: break-word;
}

.video-wrapper {
  position: relative;
  background-color: #000;
  border-radius: 4px;
  margin-bottom: 20px;
  min-height: 200px;
}

video {
  width: 100%;
  display: block;
  border-radius: 4px;
}

.player-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10;
  color: white;
  pointer-events: none;
}

.spinner {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 4px solid #fff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.controls-panel {
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.mode-switcher {
  display: flex;
  margin-bottom: 20px;
}

.mode-switcher button {
  flex-grow: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.mode-switcher button:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

.mode-switcher button:last-child {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-left: none;
}

.mode-switcher button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.playback-controls {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.timeline-container {
  position: relative;
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
}

.timeline-slider {
  position: absolute;
  width: 100%;
  height: 10px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  z-index: 2;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: #dc3545;
  border-radius: 50%;
  margin-top: -4px;
}

.timeline-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #dc3545;
  border-radius: 50%;
  border: none;
}

.timeline-background {
  position: absolute;
  width: 100%;
  height: 10px;
  background-color: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  z-index: 1;
}

.recorded-chunk {
  position: absolute;
  height: 100%;
  background-color: #28a745;
  opacity: 0.8;
}

.timeline-labels {
  position: absolute;
  top: 15px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6c757d;
  z-index: 0;
  pointer-events: none;
}
</style>