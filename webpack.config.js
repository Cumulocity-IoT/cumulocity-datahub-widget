const URLImportPlugin  = require("webpack-external-import/webpack");

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                use: ["source-map-loader"],
                enforce: "pre"
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
        filename: '[contenthash].js'
    },
};
