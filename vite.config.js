import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function proxyEntry(prefix, target) {
  return [
    prefix,
    {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(new RegExp(`^${prefix}`), ''),
      configure(proxy) {
        proxy.on('proxyReq', (proxyReq) => {
          proxyReq.removeHeader('origin');
          proxyReq.removeHeader('referer');
        });
      },
    },
  ];
}

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: Object.fromEntries([
      proxyEntry('/proxy/openai', 'https://api.openai.com'),
      proxyEntry('/proxy/anthropic', 'https://api.anthropic.com'),
      proxyEntry('/proxy/zhipu', 'https://open.bigmodel.cn'),
      proxyEntry('/proxy/dashscope', 'https://dashscope.aliyuncs.com'),
      proxyEntry('/proxy/deepseek', 'https://api.deepseek.com'),
    ]),
  },
});
