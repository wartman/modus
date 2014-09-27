var gulp = require('gulp');
var concat = require('gulp-concat');
var mocha = require('gulp-mocha');
var mochaPhantomJs = require('gulp-mocha-phantomjs');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var replace = require('gulp-replace');

gulp.task('build', function() {
  var meta = require('./package.json');
  return gulp.src([
      './src/intro.js',
      './src/helpers.js',
      './src/startContext.js',
      './src/Loader.js',
      './src/Module.js',
      './src/modus.js',
      './src/endContext.js',
      './src/outro.js'
    ])
    .pipe(concat('modus.js'))
    .pipe(replace(/@VERSION/g, meta.version))
    .pipe(replace(/@DATE/g, ( new Date() ).toISOString().replace( /:\d+\.\d+Z$/, "Z" )) )
    .pipe(gulp.dest('./dist/'))
    .pipe(uglify())
    .pipe(rename('modus.min.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('mochaPhantomJs', function () {
  return gulp.src('./test/runner.html')
    .pipe(mochaPhantomJs({reporter: 'spec'}));
});

gulp.task('mocha', function () {
  return gulp.src('./test/Build_test.js')
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('default', ['build', 'mocha', 'mochaPhantomJs']);
