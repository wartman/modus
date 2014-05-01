var gulp = require('gulp');
var concat = require('gulp-concat');
var qunit = require('gulp-qunit');

gulp.task('build', function() {
  gulp.src([
      './src/intro.js',
      './src/helpers.js',
      './src/Modus.js',
      './src/Import.js',
      './src/Export.js',
      './src/Module.js',
      './src/Loader.js',
      './src/client/loaders.js',
      './src/server/loaders.js',
      './src/outro.js',
    ])
    .pipe(concat('Modus.js'))
    .pipe(gulp.dest('./dist/'))
});

gulp.task('test', function () {
  gulp.src('./test/test_runner.html')
    .pipe(qunit());
});

gulp.task('default', ['build', 'test']);