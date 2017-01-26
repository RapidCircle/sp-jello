var gulp = require('gulp');
var minify = require('gulp-minify');
var concat = require('gulp-concat');
var pkg =  require('./package.json');
gulp.task('compress', function() {
  gulp.src(['lib/jello.js','lib/jello.*.js'])
    .pipe(concat('jello.js'))
    .pipe(minify({
        ext:{
            src: '-' + pkg.version + '.js',
            min: '-' + pkg.version + '.min.js'
        },
        exclude: [],
        ignoreFiles: ['-min.js']
    }))
    .pipe(gulp.dest('bin'));
});

gulp.task('default', ['compress']);
