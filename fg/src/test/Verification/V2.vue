<template>
  <v-main>
    <div class="slider-captcha-container">
      <div class="captcha-body" :style="{ width: containerWidth + 'px' }">
        <!-- 背景圖 Canvas -->
        <canvas ref="bgCanvas" :width="containerWidth" :height="containerHeight"></canvas>
        <!-- 拼圖滑塊 Canvas (絕對定位) -->
        <canvas ref="puzzleCanvas" class="puzzle-piece" :width="puzzleSize" :height="containerHeight"
          :style="{ left: sliderLeft + 'px' }"></canvas>
        <!-- 成功提示 -->
        <div v-if="isVerified" class="success-tip">
          <span>驗證成功</span>
        </div>
        <!-- 刷新按鈕 -->
        <div class="refresh-button" @click="reset">↻</div>
      </div>

      <div class="slider-track" :style="{ width: containerWidth + 'px' }">
        <div class="slider-handle" :style="{ left: sliderLeft + 'px' }" @mousedown.prevent="onDragStart">
          <span class="handle-icon">|||</span>
        </div>
        <span class="slider-prompt">向右拖動滑塊完成拼圖</span>
        <!-- 驗證失敗時的軌跡 -->
        <div v-if="showFailTrack" class="fail-track" :style="{ width: sliderLeft + 'px' }"></div>
      </div>
    </div>
  </v-main>
</template>

<script>
export default {
  name: 'SliderCaptcha',
  data() {
    return {
      containerWidth: 320,
      containerHeight: 160,
      puzzleSize: 50, // 拼圖的尺寸 (寬高)

      puzzleX: 0, // 拼圖在背景圖中的正確 X 座標
      puzzleY: 0, // 拼圖在背景圖中的正確 Y 座標

      sliderLeft: 0, // 滑塊距離左側的距離
      isDragging: false,
      startX: 0, // 拖曳開始時的滑鼠 X 座標

      isVerified: false, // 是否已驗證成功
      showFailTrack: false, // 是否顯示失敗的紅色軌跡
    };
  },
  mounted() {
    this.reset();
  },
  methods: {
    // 初始化或重置驗證碼
    reset() {
      // 重置所有狀態
      this.isVerified = false;
      this.isDragging = false;
      this.sliderLeft = 0;
      this.showFailTrack = false;

      // 隨機生成拼圖的位置
      // X 軸位置：避開最左側，留出拖曳空間
      this.puzzleX = Math.floor(Math.random() * (this.containerWidth - this.puzzleSize * 2)) + this.puzzleSize;
      // Y 軸位置：避開頂部和底部邊緣
      this.puzzleY = Math.floor(Math.random() * (this.containerHeight - this.puzzleSize - 20)) + 10;

      // 繪製 Canvas
      this.draw();
    },

    // 繪製背景圖和拼圖
    draw() {
      const bgCtx = this.$refs.bgCanvas.getContext('2d');
      const puzzleCtx = this.$refs.puzzleCanvas.getContext('2d');

      // 建立一個 Image 物件來載入圖片
      const img = new Image();
      img.crossOrigin = "Anonymous"; // 解決跨域圖片無法繪製的問題
      img.src = `https://picsum.photos/${this.containerWidth}/${this.containerHeight}?t=${new Date().getTime()}`; // 使用 picsum 提供的隨機圖

      img.onload = () => {
        // --- 繪製背景圖 (帶有缺口) ---
        bgCtx.clearRect(0, 0, this.containerWidth, this.containerHeight);
        bgCtx.drawImage(img, 0, 0, this.containerWidth, this.containerHeight);
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 半透明黑色填充
        // 繪製缺口形狀
        this.drawPuzzleShape(bgCtx, this.puzzleX, this.puzzleY);
        bgCtx.fill();

        // --- 繪製可拖動的拼圖塊 ---
        puzzleCtx.clearRect(0, 0, this.puzzleSize, this.containerHeight);
        // 繪製拼圖形狀並裁剪
        this.drawPuzzleShape(puzzleCtx, 0, this.puzzleY);
        puzzleCtx.clip();
        // 將原圖對應位置的圖像繪製到拼圖塊上
        puzzleCtx.drawImage(img, -this.puzzleX, 0, this.containerWidth, this.containerHeight);
      };
    },

    // 輔助函式：繪製拼圖的形狀 (一個帶有凹凸的方塊)
    drawPuzzleShape(ctx, x, y) {
      const r = 8; // 凹凸的半徑
      const s = this.puzzleSize;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + s / 2 - r, y);
      ctx.arc(x + s / 2, y - r + 2, r, 0, 2 * Math.PI); // 上凸
      ctx.lineTo(x + s, y);
      ctx.lineTo(x + s, y + s / 2 - r);
      ctx.arc(x + s + r - 2, y + s / 2, r, 0, 2 * Math.PI); // 右凸
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x, y + s);
      ctx.closePath();
    },

    // 滑鼠按下，開始拖曳
    onDragStart(e) {
      if (this.isVerified) return; // 如果已驗證，則不執行任何操作
      this.isDragging = true;
      this.startX = e.clientX; // 記錄滑鼠初始位置

      // 綁定全域事件，這樣滑鼠移出滑塊也能繼續拖動
      window.addEventListener('mousemove', this.onDragMove);
      window.addEventListener('mouseup', this.onDragEnd);
    },

    // 滑鼠移動，處理拖曳
    onDragMove(e) {
      if (!this.isDragging) return;

      const moveX = e.clientX - this.startX;
      let newLeft = moveX;

      // 邊界檢查
      if (newLeft < 0) {
        newLeft = 0;
      }
      const maxLeft = this.containerWidth - this.puzzleSize;
      if (newLeft > maxLeft) {
        newLeft = maxLeft;
      }

      this.sliderLeft = newLeft;
    },

    // 滑鼠放開，結束拖曳並驗證
    onDragEnd() {
      if (!this.isDragging) return;

      this.isDragging = false;
      // 移除全域事件
      window.removeEventListener('mousemove', this.onDragMove);
      window.removeEventListener('mouseup', this.onDragEnd);

      // --- 驗證邏輯 ---
      const tolerance = 5; // 容錯範圍，5px
      if (Math.abs(this.sliderLeft - this.puzzleX) <= tolerance) {
        // 驗證成功
        this.isVerified = true;
      } else {
        // 驗證失敗
        this.showFailTrack = true;
        // 0.5秒後重置滑塊
        setTimeout(() => {
          this.sliderLeft = 0;
          this.showFailTrack = false;
        }, 500);
      }
    },
  },
  // 組件銷毀前，確保移除全域事件監聽器
  beforeDestroy() {
    window.removeEventListener('mousemove', this.onDragMove);
    window.removeEventListener('mouseup', this.onDragEnd);
  }
};
</script>

<style scoped>
.slider-captcha-container {
  display: inline-block;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
  font-family: sans-serif;
  user-select: none;
  /* 防止拖動時選中文本 */
}

.captcha-body {
  position: relative;
  height: 160px;
  border-radius: 6px;
  overflow: hidden;
}

.puzzle-piece {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.refresh-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 30px;
  height: 30px;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  cursor: pointer;
  z-index: 3;
}

.refresh-button:hover {
  background: rgba(0, 0, 0, 0.6);
}

.success-tip {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(40, 167, 69, 0.8);
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  font-weight: bold;
  z-index: 4;
}

.slider-track {
  position: relative;
  height: 40px;
  background-color: #e9e9e9;
  border-radius: 20px;
  margin-top: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slider-prompt {
  color: #999;
}

.slider-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 40px;
  background-color: #ffffff;
  border: 1px solid #ccc;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
}

.slider-handle:hover {
  background-color: #007bff;
  color: white;
}

.handle-icon {
  font-size: 16px;
  color: #999;
  transform: rotate(90deg);
}

.slider-handle:hover .handle-icon {
  color: white;
}

.fail-track {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background-color: rgba(220, 53, 69, 0.5);
  border-radius: 20px;
  transition: width 0.1s;
}
</style>