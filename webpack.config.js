const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
module.exports = {
    entry: './scripts/index.js',
    /*output: {
	filename: 'main.js',
	path: path.resolve(__dirname, 'dist'),
    },*/
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
		use: ['style-loader', 'css-loader']
	    },
	],
	
    },
    plugins: [
	new CleanWebpackPlugin({
            verbose: true
	}),
	new HtmlWebpackPlugin({ template: './index.html', filename: 'index.html', inject: "head", scriptLoading: "blocking", })
    ],
};
