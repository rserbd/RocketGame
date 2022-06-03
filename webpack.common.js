const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    plugins: [
        new HtmlWebpackPlugin({
            template: 'html/index.html'
        }),
        new CopyPlugin({
            patterns: [
                {from: 'static', to: 'static'}
            ]
        }),
    ],

    entry: './game.ts',
    module: {
        rules: [
            {
                test: /\.(glsl|vs|fs|vert|frag)$/, exclude: /node_modules/, use: ['raw-loader']
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }

        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },

}
