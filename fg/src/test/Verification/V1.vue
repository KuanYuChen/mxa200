<!-- 驗證碼樣式 (隨機6個數) -->
<template>
  <v-main>
    <div class="captcha-container">
      <div class="canvas-wrapper">
        <!-- 用於繪製驗證碼的 canvas 元素 -->
        <canvas ref="captchaCanvas" width="220" height="40" @click="generateCaptcha"></canvas>
        <v-btn @click.prevent="generateCaptcha">換一張</v-btn>
      </div>
      <div style="display: flex; width: 20%;">
        <v-text-field v-model="userInput" placeholder="請輸入驗證碼" @keyup.enter="validateCaptcha"></v-text-field>
        <v-btn @click="validateCaptcha">驗證</v-btn>

      </div>
    </div>
  </v-main>
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      charPool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', // 用來生成驗證碼的字符池
      code: '', // 生成的正確驗證碼
      userInput: '', // 使用者輸入的值
    };
  },
  mounted() {
    this.generateCaptcha();
  },
  methods: {
    // 產生一個隨機的驗證碼文字
    generateRandomCode(length = 4) {
      let result = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * this.charPool.length);
        result += this.charPool.charAt(randomIndex);
      }
      this.code = result;
    },

    // 繪製驗證碼到 Canvas 上
    generateCaptcha() {
      // 1. 產生新的隨機碼
      this.generateRandomCode(6);

      // 2. 獲取 canvas DOM 元素和 2D 繪圖上下文
      const canvas = this.$refs.captchaCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // 3. 繪製背景
      ctx.fillStyle = '#f0f0f0'; // 淺灰色背景
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4. 繪製驗證碼文字 (加入干擾)
      for (let i = 0; i < this.code.length; i++) {
        const char = this.code[i];
        const fontSize = Math.random() * 10 + 20; // 20-30px 的隨機字體大小
        const angle = (Math.random() - 0.5) * Math.PI / 6; // -30 到 +30 度的隨機旋轉
        const x = 20 + i * 25; // 每個字符的 x 座標
        const y = canvas.height / 2 + Math.random() * 10 - 5; // y 座標上下隨機浮動

        ctx.save(); // 保存當前繪圖狀態
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = `rgb(${Math.random() * 150}, ${Math.random() * 150}, ${Math.random() * 150})`; // 隨機深色
        ctx.translate(x, y); // 將原點移動到字符位置
        ctx.rotate(angle); // 旋轉
        ctx.fillText(char, 0, 0); // 在新原點繪製字符
        ctx.restore(); // 恢復之前保存的繪圖狀態
      }

      // 5. 繪製干擾線
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.strokeStyle = `rgb(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200})`; // 隨機顏色
        ctx.stroke();
      }

      // 6. 繪製干擾點
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, 2 * Math.PI);
        ctx.fillStyle = `rgb(${Math.random() * 200}, ${Math.random() * 200}, ${Math.random() * 200})`;
        ctx.fill();
      }
    },

    // 驗證使用者輸入
    validateCaptcha() {
      if (!this.userInput) {
        useSetup().showAlertDialog({ icon: "warn", title: "請輸入驗證碼！" })
        return;
      }
      // 比較時忽略大小寫
      if (this.userInput.toLowerCase() === this.code.toLowerCase()) {
        useSetup().showAlertDialog({ icon: "success", title: "驗證成功！" })
      } else {
        useSetup().showAlertDialog({ icon: "error", title: "驗證失敗，請重試！" })
      }
      // 無論成功或失敗，都清空輸入框並產生新的驗證碼
      this.userInput = '';
      this.generateCaptcha();
    }
  }
}
</script>

<style scoped>
.captcha-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #fff;
  font-family: Arial, sans-serif;
}

.canvas-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

canvas {
  border: 1px solid #ddd;
  cursor: pointer;
  /* 提示使用者可以點擊刷新 */
}

.canvas-wrapper a {
  font-size: 14px;
  color: #007bff;
  text-decoration: none;
}

.canvas-wrapper a:hover {
  text-decoration: underline;
}

input[type="text"] {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  width: 120px;
}

button {
  padding: 8px 12px;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}
</style>