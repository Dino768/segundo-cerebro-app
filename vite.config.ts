import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/segundo-cerebro-app/',
  plugins: [react()],
  test: { environment: 'node' },
});
