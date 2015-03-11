'use strict'
var gulp       = require('gulp')
var gp         = require('gulp-load-plugins')
var path       = require('path')
var browserify = require('browserify')
var source     = require('vinyl-source-stream')

// JS
gulp.task('build', function(){

  browserify({
    entries: ['./src/Three.js'],
    extensions: ['.js'],
    standalone: 'THREE',
    debug: true
  })

  .transform('uglifyify')

  .bundle()

  // Pass desired file name to browserify with vinyl
  .pipe(source('three.min.js'))

  .pipe(gulp.dest('./build/'))

})

gulp.task('default', function(){

  gulp.start('build')

});
