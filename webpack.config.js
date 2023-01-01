const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = {
    entry: './scripts/index.js',
    output: {
	path: path.resolve(__dirname, './dist'),
	filename: './mpw.js',
	library: 'MPW',
	libraryTarget: 'var',
    },
    mode: "development",
    module: {
	rules: [
	    {
		test: /\.css$/i,
		use: [MiniCssExtractPlugin.loader, "css-loader"],
	    },
	    {
		test: /\.(jpe?g|png|gif|svg|mp3|svg)$/i, 
		type: 'asset/resource',
	    },
	],
    },
    devtool: "source-map",
    plugins: [
	// Removes the dist/ folder before building
	new CleanWebpackPlugin(),
	new HtmlWebpackPlugin({
	    template: './index.template.html',
	    filename: 'index.html',
	    favicon: "./assets/favicon.ico",
	    meta: {viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no'},
	}),
	// Polyfill for non web libraries
	new NodePolyfillPlugin(),
	// Prevents non styled flashing on load
	new MiniCssExtractPlugin(),
	// Make jquery available globally
	new webpack.ProvidePlugin({
	    $: "jquery",
	    jQuery: "jquery",
	    'window.jQuery': 'jquery',
	}),
	// Ignore non english bip39 wordlists
	new webpack.IgnorePlugin({
	    resourceRegExp: /^\.\/wordlists\/(?!english)/,
	    contextRegExp: /bip39\/src$/
	}),
    ],
};
