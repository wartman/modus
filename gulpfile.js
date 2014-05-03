var Modus = require('./'); // Is GLOBAL
var gulp = require('gulp');
var concat = require('gulp-concat');
var qunit = require('gulp-qunit');
var mocha = require('gulp-mocha');
var replace = require('gulp-replace');

gulp.task('build', function() {
  var meta = require('./package.json');
  gulp.src([
      './src/intro.js',
      './src/helpers.js',
      './src/Modus.js',
      './src/plugin.js',
      './src/Import.js',
      './src/Export.js',
      './src/Module.js',
      './src/client/loader.js',
      './src/server/loader.js',
      './src/outro.js',
    ])
    .pipe(concat('Modus.js'))
    .pipe(replace(/@VERSION/g, meta.version))
    .pipe(replace(/@DATE/g, ( new Date() ).toISOString().replace( /:\d+\.\d+Z$/, "Z" )) )
    .pipe(gulp.dest('./dist/'));
});

gulp.task('qunit', function () {
  gulp.src('./test/client/test_runner.html')
    .pipe(qunit());
});

gulp.task('mocha', function () {
  gulp.src('./test/*_test.js')
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('default', ['build', 'qunit', 'mocha']);