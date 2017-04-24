var gulp = require('gulp');
var minify = require('gulp-minify');
var concat = require('gulp-concat');
var pkg = require('./package.json');
var jasmine = require('gulp-jasmine');
var notify = require('gulp-notify');

gulp.task('test', function() {
    gulp.src('./tests/*.js')
        .pipe(jasmine())
        .on('error', notify.onError({
            title: 'Jasmine Test Failed',
            message: 'One or more tests failed, see the cli for details.'
        }));
});

gulp.task('default', function() {
    gulp.src(['lib/jello.js', 'lib/jello.*.js'])
        .pipe(concat('jello.js'))
        .pipe(minify({
            ext: {
                src: '-' + pkg.version + '.js',
                min: '-' + pkg.version + '.min.js'
            },
            exclude: [],
            ignoreFiles: ['-min.js']
        }))
        .pipe(gulp.dest('bin'));
});
