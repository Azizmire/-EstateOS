import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/**/*.d.ts',
        'src/**/*.types.ts',
        'src/**/*.contract.ts',
        'src/**/*.interface.ts',
        'src/services/file-asset.service.ts',
        'src/storage/provider.ts',
        'src/storage/storage-metadata.ts',
      ],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 75,
        branches: 70,
      },
    },
  },
});
