import { defineConfig } from 'cypress';
import { existsSync, readFileSync } from 'fs';
import cypressPlayback from '@oreillymedia/cypress-playback/addTasks.js';
export default defineConfig({
    e2e: {
        baseUrl: 'http://127.0.0.1:5500',
        setupNodeEvents(on, config) {
            cypressPlayback(on, config);
            on('task', {
                fileExists(filePath) {
                    return existsSync(filePath);
                },
            });
        },
    },
});
