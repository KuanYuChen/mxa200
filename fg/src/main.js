// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'
import * as func from './utils.js'; // global function表

// Composables
import { createApp } from 'vue'

const app = createApp(App)
app.config.globalProperties.$utils = func;

registerPlugins(app)

app.mount('#app')
