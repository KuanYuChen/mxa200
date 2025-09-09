// Plugins
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import ViteFonts from 'unplugin-fonts/vite'

// Utilities
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    ViteFonts({
      google: {
        families: [{
          name: 'Roboto',
          styles: 'wght@100;300;400;500;700;900',
        }],
      },
    }),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 5588,
    host: "0.0.0.0",
    cors: true,
    https: false,
    // 自动启动浏览器
    // open: true,
    // proxy: {
    //   "/api": {
    //     target: "http://0.0.0.0:4456/",
    //     changeOrigin: true, //是否跨域
    //     ws: true,
    //     pathRewrite: {
    //       //"^/v1": ""
    //     }
    //   },
    // }
    proxy: {
      // 對應 http://192.168.15.211:8080/api/...
      "/api-211": {
        target: "http://192.168.15.211:8080",
        changeOrigin: true,
        ws: true,
        rewrite: path => path.replace(/^\/api-211/, '/api')
      },
      // "/api-proxy": {
      //   target: "http://0.0.0.0:8080",
      //   changeOrigin: true,
      //   ws: true,
      //   rewrite: path => path.replace(/^\/api-proxy/, '/api')
      // },

      // "/api-proxy": {
      //   // 使用 router 函式來動態決定目標
      //   router: (req) => {
      //     // req.headers.host 會是 'localhost:5173' 或 '192.168.15.100:5173' 等
      //     const host = req.headers.host;
      //     if (!host) {
      //       // 如果請求沒有 host header，提供一個預設值或拋出錯誤
      //       return 'http://localhost:8080';
      //     }
      //     // 從 host 中分離出主機名稱（去掉 port）
      //     const hostname = host.split(':')[0];
      //     // 組合出新的目標地址，port 固定為後端服務的 8080
      //     const newTarget = `http://${hostname}:8080`;
      //     console.log(`[Proxy] Routing /api-proxy to -> ${newTarget}`);
      //     return newTarget;
      //   },
      //   changeOrigin: true,
      //   ws: true,
      //   rewrite: path => path.replace(/^\/api-proxy/, '/api')
      // },

      // 對應 http://0.0.0.0:4456/api/...
      "/api": {
        target: "http://0.0.0.0:8080",
        changeOrigin: true,
        ws: true,
      },
      "/image": {
        target: "http://0.0.0.0:4456",
        changeOrigin: true,
        ws: true,
      },

      // 代理所有對 Nx Server 的 REST API 請求
      '/rest-api-proxy': {
        target: 'https://192.168.15.198:7001', // 指向您真實的 Nx Server
        changeOrigin: true,
        secure: false, // 如果 Nx Server 是自簽名憑證，此項必須
        rewrite: (path) => path.replace(/^\/rest-api-proxy/, '/rest/v3'),
      },
      // 代理所有對媒體串流的請求
      '/media-proxy': {
        target: 'https://192.168.15.198:7001', // 指向您真實的 Nx Server
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/media-proxy/, '/media'),
      }
    }
  }

})
