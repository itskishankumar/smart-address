import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { urlExpanderPlugin } from './server/proxy'

export default defineConfig({
  plugins: [
    vue(),
    urlExpanderPlugin(),
  ],
})
