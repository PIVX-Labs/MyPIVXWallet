import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    assetsInclude: '**/*.toml',
    plugins: [vue()],
    test: {
        environment: 'happy-dom',
        globals: true,
        coverage: {
            provider: 'istanbul',
        },
    },
});
