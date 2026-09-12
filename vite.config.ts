import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'es2022' },
  test: { environment: 'node' },
} as ReturnType<typeof defineConfig>);
