const URLImportPlugin  = require("webpack-external-import/webpack");
const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: {
        [require('./cumulocity.json').contextPath]: './dist/bundle-src/custom-widget.js'
    },
    resolve: {
        alias: {
            "~styles": path.resolve(__dirname, 'styles')
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
            },{
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },{
                test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
                loader: 'url-loader',
                options: {
                    limit: 8192,
                    publicPath: `/apps/${require('./cumulocity').contextPath}/`
                },
            }
        ]
    },
    optimization: {
        runtimeChunk: {
            name: "webpackRuntime"
        }
    },
    plugins: [
        new URLImportPlugin ({
            manifestName: require('./cumulocity').contextPath,
            fileName: "importManifest.js",
            basePath: '',
            publicPath: `/apps/${require('./cumulocity').contextPath}/`,
            useExternals: {
                "@angular/animations": "AngularAnimations",
                "@angular/common": "AngularCommon",
                "@angular/common/http": "AngularCommonHttp",
                "@angular/core": "AngularCore",
                "@angular/forms": "AngularForms",
                "@angular/http": "AngularHttp",
                "@angular/platform-browser": "AngularPlatformBrowser",
                "@angular/platform-browser/animations": "AngularPlatformBrowserAnimations",
                "@angular/router": "AngularRouter",
                "@c8y/client": "C8yClient",
                "@c8y/ngx-components": "C8yNgxComponents"
            },
        })
    ],
    output: {
        filename: '[contenthash].js',
        path: path.resolve(__dirname, 'dist/widget')
    },
};
