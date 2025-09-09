<!-- =================================================== Loading動畫 =================================================== -->
<template>
  <div v-if="loading" class="loading-overlay">
    <div class="spinner-container">
      <div class="spinner" :style="spinnerStyle"></div>
      <p v-if="text" class="loading-text" :style="textStyle">{{ text }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoadingSpinner',
  props: {
    loading: {
      type: Boolean,
      default: true,
    },
    size: {
      type: Number,
      default: 50, // 單位 px
    },
    color: {
      type: String,
      default: '#42b983', // Vue 綠色
    },
    thickness: {
      type: Number,
      default: 5, // 單位 px
    },
    text: {
      type: String,
      default: 'Loading...',
    },
    textColor: {
      type: String,
      default: '#333',
    }
  },
  computed: {
    spinnerStyle() {
      return {
        width: `${this.size}px`,
        height: `${this.size}px`,
        border: `${this.thickness}px solid #f3f3f3`, // Light grey track
        borderTop: `${this.thickness}px solid ${this.color}`, // Active color
      };
    },
    textStyle() {
      return {
        color: this.textColor,
        marginTop: `${this.size / 4}px` // 根據 spinner 大小調整間距
      };
    }
  }
}
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  /* 或者 absolute，取決於你的佈局需求 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  /* 半透明背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  /* 確保在最上層 */
}

.spinner-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-sizing: border-box;
  /* 確保 border 不會增加元素總寬高 */
}

.loading-text {
  font-size: 1em;
  font-weight: bold;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>