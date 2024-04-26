/* istanbul ignore file */
/* eslint-env node */
/* eslint @typescript-eslint/no-var-requires: "off" */

import path from 'path';
import { merge } from 'webpack-merge';
import common from './webpack.common.js';
import webpack from 'webpack';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const version = JSON.parse(
    readFileSync('./package.json', { encoding: 'utf8' })
).version;

export default merge(common, {
    mode: 'development',
    devServer: {
        static: {
            directory: path.join(__dirname, './'),
            watch: {
                ignored: [
                    // ignore changes in '.git' subdirectory (prevent constant hot-reloading in auto-fetch configurations)
                    '**/.git',
                    /node_modules/,
                    /coverage/,
                ],
            },
        },
        compress: true,
        port: 5500,
        hot: true,
        allowedHosts: ['all'],
        client: {
            overlay: false,
        },
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
    },
    plugins: [
        new webpack.DefinePlugin({
            __VUE_OPTIONS_API__: false,
            __VUE_PROD_DEVTOOLS__: true,
            VERSION: JSON.stringify(`${version}-${commitHash}`),
        }),
    ],
});
