/* eslint-env node */
/* eslint @typescript-eslint/no-var-requires: "off" */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const { readFileSync } = require('fs');

// Inject the Changelog and Version to the app
const changelog = readFileSync('./changelog.md', { encoding: 'utf8' });
const version = JSON.parse(
    readFileSync('./package.json', { encoding: 'utf8' })
).version;

module.exports = {
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
        ],
    },
    resolve: {
        alias: {
            'bn.js': path.join(__dirname, 'node_modules/bn.js/lib/bn.js'),
        },
        fallback: {
            fs: false,
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.template.html',
            filename: 'index.html',
            favicon: './assets/favicon.ico',
            meta: {
                viewport:
                    'width=device-width, initial-scale=1, shrink-to-fit=no',
            },
        }),
        // Polyfill for non web libraries
        new NodePolyfillPlugin(),
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
            VERSION: JSON.stringify(version),
        }),
        // Ignore non english bip39 wordlists
        new webpack.IgnorePlugin({
            resourceRegExp: /^\.\/wordlists\/(?!english)/,
            contextRegExp: /bip39\/src$/,
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
    ],
};
