const {src, dest, series} = require('gulp');
const filter = require('gulp-filter');
const zip = require('gulp-zip');
const ngPackagr = require('ng-packagr');
const fs = require('fs-extra');
const del = require('del');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const replace = require('gulp-replace');
const path = require('path');

function clean() {
    return del(['dist']);
}

const compile = series(
    function buildAngularLibrary() { return ngPackagr.build({project: './ng-package.json'}) },
    function separateWebpackBuildSrc() { return fs.copy('./dist/widget-library/fesm5', './dist/bundle-src') },
    function replaceStylePath() {
        return src('./dist/widget-library/**/*')
            .pipe(replace(/~styles/g, function () {
                return path.relative(this.file.dirname, './dist/widget-library/styles').replace(/\\/g, '/')
            }))
            .pipe(dest('./dist/widget-library/'))
    },
    function packLibrary() { return exec("npm pack ./widget-library", { cwd: './dist' }) }
)

const bundle = series(
    function webpackBuild() { return exec("npx webpack") },
    function copyCumulocityJson() { return fs.copy('./cumulocity.json', './dist/widget/cumulocity.json')},
    function createZip() {
        return src('./dist/widget/**/*')
            // Filter out the webpackRuntime chunk, we only need the widget code chunks
            .pipe(filter(file => !/^[a-f0-9]{20}\.js(\.map)?$/.test(file.relative)))
            .pipe(zip('widget.zip'))
            .pipe(dest('dist/'))
    }
)

exports.clean = clean;
exports.build = compile;
exports.bundle = bundle;
exports.default = series(clean, compile, bundle, async function success() {
    console.log("Build Finished Successfully!");
    console.log("Runtime Widget Output (Install in the browser): dist/widget.zip");
    const pkgJson = require('./dist/widget-library/package.json');
    console.log(`Widget Angular Library (Install with: "npm i <filename.tgz>"): dist/${pkgJson.name}-${pkgJson.version}.tgz`);
});
