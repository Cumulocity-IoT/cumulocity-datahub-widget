const {src, dest, series} = require('gulp');
const webpack = require('webpack-stream');
const filter = require('gulp-filter');
const merge = require('merge-stream');
const zip = require('gulp-zip');
const ngPackagr = require('ng-packagr');
const fs = require('fs-extra');
const del = require('del');

function clean() {
    return del(['dist']);
}

function compile() {
    return ngPackagr.build({project: './ng-package.json'})
        .then(() => fs.copy('./dist/ng-packagr-output/fesm5', './dist/bundle-src'))
}

function bundle() {
    const widgetCode = src('./dist/bundle-src/custom-widget.js', {sourcemaps: true})
        .pipe(webpack(require('./webpack.config.js')))
        // Filter out the webpackRuntime chunk, we only need the widget code chunks
        .pipe(filter(file => !/^[a-f0-9]{20}\.js(\.map)?$/.test(file.relative)));

    const c8yJson = src('./cumulocity.json')

    const codeOutput = merge(
            widgetCode,
            c8yJson
        );

    return merge(
        codeOutput
            .pipe(dest('dist/widget/')),
        codeOutput
            .pipe(zip('widget.zip'))
            .pipe(dest('dist/'))
    )
}

exports.clean = clean;
exports.build = compile;
exports.bundle = bundle;
exports.default = series(clean, compile, bundle);
