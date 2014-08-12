var gulp = require('gulp');
var concat = require('gulp-concat');
var mocha = require('gulp-mocha');
var mochaPhantomJs = require('gulp-mocha-phantomjs');
var replace = require('gulp-replace');

gulp.task('build', function() {
  var meta = require('./package.json');
  return gulp.src([
      './src/intro.js',
      './src/helpers.js',
      './src/EventEmitter.js',
      './src/Loader.js',
      './src/Import.js',
      './src/Module.js',
      './src/modus.js',
      './src/outro.js',
    ])
    .pipe(concat('modus.js'))
    .pipe(replace(/@VERSION/g, meta.version))
    .pipe(replace(/@DATE/g, ( new Date() ).toISOString().replace( /:\d+\.\d+Z$/, "Z" )) )
    .pipe(gulp.dest('./dist/'));
});

gulp.task('mochaPhantomJs', function () {
  return gulp.src('./test/runner.html')
    .pipe(mochaPhantomJs({reporter: 'spec'}));
});

gulp.task('mocha', function () {
  var Modus = require('./'); // Is GLOBAL
  return gulp.src('./test/Build_test.js')
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('default', ['build', 'mocha', 'mochaPhantomJs']);