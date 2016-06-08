var gulp = require('gulp');
var runSequence = require('run-sequence');
var to5 = require('gulp-babel');
var paths = require('../paths');
var compilerOptions = require('../babel-options');
var compilerTsOptions = require('../typescript-options');
var assign = Object.assign || require('object.assign');
var through2 = require('through2');
var concat = require('gulp-concat');
var insert = require('gulp-insert');
var rename = require('gulp-rename');
var tools = require('aurelia-tools');
var ts = require('gulp-typescript');
var jsName = paths.packageName + '.js';
var compileToModules = ['es2015', 'commonjs', 'amd', 'system', 'native-modules'];

function cleanGeneratedCode() {
  return through2.obj(function(file, enc, callback) {
    file.contents = new Buffer(tools.cleanGeneratedCode(file.contents.toString('utf8')));
    this.push(file);
    return callback();
  });
}

gulp.task('build-index', function() {
  var importsToAdd = [];

  return gulp.src(paths.files)
    .pipe(through2.obj(function(file, enc, callback) {
      file.contents = new Buffer(tools.extractImports(file.contents.toString('utf8'), importsToAdd));
      this.push(file);
      return callback();
    }))
    .pipe(concat(jsName))
    .pipe(insert.transform(function(contents) {
      return tools.createImportBlock(importsToAdd) + contents;
    }))
    .pipe(gulp.dest(paths.output));
});

function indexForTypeScript() {
  return gulp
    .src(paths.output + paths.packageName + '.js')
    .pipe(rename(function (path) {
      if (path.extname == '.js') {
        path.extname = '.ts';
      }
  }));
}

compileToModules.forEach(function(moduleType){
  gulp.task('build-babel-' + moduleType, function () {
    return gulp.src(paths.output + jsName)
      .pipe(to5(assign({}, compilerOptions[moduleType]())))
      .pipe(cleanGeneratedCode())
      .pipe(gulp.dest(paths.output + moduleType));
  });
  
  if (moduleType === 'native-modules') return; // typescript doesn't support the combination of: es5 + native modules
  gulp.task('build-ts-' + moduleType, function () {
    var tsProject = ts.createProject(
      compilerTsOptions({ module: moduleType, target: moduleType == 'es2015' ? 'es2015' : 'es5' }), ts.reporter.defaultReporter());
    var tsResult = indexForTypeScript().pipe(ts(tsProject));
    return tsResult.js
      .pipe(gulp.dest(paths.output + moduleType));
  });
});

gulp.task('build-dts', function() {
  var tsProject = ts.createProject(
    compilerTsOptions({ removeComments: false, target: "es2015", module: "es2015" }), ts.reporter.defaultReporter());
  var tsResult = indexForTypeScript().pipe(ts(tsProject));
  return tsResult.dts
    .pipe(gulp.dest(paths.output));
});

gulp.task('build', function(callback) {
  return runSequence(
    'clean',
    'build-index',
    compileToModules
      .map(function(moduleType) { return 'build-babel-' + moduleType })
      .concat(paths.useTypeScriptForDTS ? ['build-dts'] : []),
    callback
  );
});

gulp.task('build-ts', function(callback) {
  return runSequence(
    'clean',
    'build-index',
    'build-babel-native-modules',
    compileToModules
      .filter(function(moduleType) { return moduleType !== 'native-modules' })
      .map(function(moduleType) { return 'build-ts-' + moduleType })
      .concat(paths.useTypeScriptForDTS ? ['build-dts'] : []),
    callback
  );
});
