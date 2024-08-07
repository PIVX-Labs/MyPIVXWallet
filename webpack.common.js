/* istanbul ignore file */
/* eslint-env node */
/* eslint @typescript-eslint/no-var-requires: "off" */

import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import PreloadWebpackPlugin from '@vue/preload-webpack-plugin';
import toml from 'toml';
import { VueLoaderPlugin } from 'vue-loader';

import { readFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Inject the Changelog and Version to the app
const changelog = readFileSync('./changelog.md', { encoding: 'utf8' });

export default {
    entry: './scripts/index.js',
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: './mpw.js',
        library: 'MPW',
        libraryTarget: 'var',
        clean: true,
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.(jpe?g|png|gif|svg|mp3|svg)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.vue/i,
                use: {
                    loader: 'vue-loader',
                    options: {
                        compilerOptions: {
                            isCustomElement: (tag) => tag === 'center',
                        },
                    },
                },
            },
            {
                test: /\.toml$/,
                // Json means we're returing an object.
                // See https://webpack.js.org/configuration/module/#ruleparserparse
                type: 'json',
                parser: {
                    parse: (str) =>
                        toml.parse(
                            str
                                .split('\n')
                                // Ignore lines starting with ~~, it means we haven't
                                // translated them yet
                                .filter((l) => !l.match(/^[\w\s]+=\s*['"]~~/))
                                .join('\n')
                        ),
                },
            },
            {
                test: /countries.json$/,
                type: 'json',
                parser: {
                    parse: (str) =>
                        JSON.parse(str).map((c) => {
                            return {
                                alpha2: c.alpha2,
                                currency: c.currency,
                            };
                        }),
                },
            },
            {
                test: /\.svg$/i,
                type: 'asset/source',
            },
        ],
    },
    resolve: {
        fallback: {
            fs: false,
            crypto: path.resolve(__dirname, 'scripts/polyfills/crypto.js'),
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.template.html',
            filename: 'index.html',
            favicon: './assets/favicon.ico',
            meta: {
                viewport:
                    'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no',
            },
        }),
        new VueLoaderPlugin(),
        // Polyfill for non web libraries
        new NodePolyfillPlugin({
            includeAliases: ['stream', 'process', 'Buffer'],
        }),
        // Prevents non styled flashing on load
        new MiniCssExtractPlugin(),
        // Make jquery available globally
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
        }),
        // Make the Changelog available globally
        new webpack.DefinePlugin({
            CHANGELOG: JSON.stringify(changelog),
        }),
        // Ignore non english bip39 wordlists
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/wordlists\/(?!english)/,
            contextRegExp: /bip39\/src$/,
        }),
        // Ignore countries-intl
        new webpack.IgnorePlugin({
            resourceRegExp: /countries-intl.json$/,
        }),
        // Copy static web-facing files
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json' },
                { from: 'assets/icons' },
                { from: 'assets/logo_opaque-dark-bg.png' },
                { from: 'scripts/native-worker.js' },
            ],
        }),
        new PreloadWebpackPlugin({
            // This is something made up, it's just to get the
            // bundle name in the service worker
            rel: 'serviceworkprefetch',
            include: 'all',
            fileWhitelist: [/\.wasm$/, /(pivx-shield|util)/],
        }),
    ],
};
