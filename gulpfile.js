var gulp = require('gulp');
var concat = require('gulp-concat');
var mocha = require('gulp-mocha');
var mochaPhantomJs = require('gulp-mocha-phantomjs');
var replace = require('gulp-replace');

gulp.task('build', function() {
  var meta = require('./package.json');
  gulp.src([
      './src/intro.js',
      './src/helpers.js',
      './src/Modus.js',
      './src/EventEmitter.js',
      './src/Import.js',
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

gulp.task('mochaPhantomJs', function () {
  gulp.src('test/runner.html')
    .pipe(mochaPhantomJs({reporter: 'spec'}));
});

// gulp.task('mocha', function () {
//   var Modus = require('./'); // Is GLOBAL
//   gulp.src('./test/*_test.js')
//     .pipe(mocha({reporter: 'spec'}));
// });

gulp.task('default', ['build', 'mochaPhantomJs']);