'use strict';

module.exports = function(grunt) {
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),


        watch: {
            files: [
                './www_dev/**/*',
                // Don't watch deps or generated files
                '!./www_dev/bundle.js',
                '!./www_dev/bundle.css',
                '!./www_dev/bower_components/**'
            ],
            tasks: ['rebuild'],
            options: {
                'event': ['all']
            }
        },


        browserSync: {
            dev: {
                bsFiles: {
                    src : [
                        'www_dev/bundle.js',
                        'www_dev/bundle.css',
                        'www_dev/index.html'
                    ]
                },
                options: {
                    watchTask: true,
                    server: {
                        baseDir: './www_dev'
                    }
                }
            }
        },


        shell: {
            'bower-install': {
                command: 'bower install'
            },
            'browserify-debug': {
                command: 'browserify "./www_dev/js/**/*.js" -e "./www_dev/js/app.js" ' +
                    '-o ./www_dev/bundle.js -d'
            },
            'browserify-release': {
                command: 'browserify "./www_dev/js/**/*.js" -e "./www_dev/js/app.js" ' +
                    '-o ./www_dev/bundle.js'
            },
            'cordova': {
                command: 'cordova build'
            }
        },

        browserify: {
            options: {
                browserifyOptions: {
                    entries: ['./www_dev/js/app.js']
                },
                /*alias: {
                    'fs': 'html5-fs'
                }*/
            },
            debug: {
                options: {
                    browserifyOptions: {
                        debug: true
                    }
                },
                src: ['./www_dev/js/**.js'],
                dest: './www_dev/bundle.js'
            },
            release: {
                src: ['./www_dev/js/***.js'],
                dest: './www_dev/bundle.js'
            }
        },


        column_lint: {
            files: {
                src: [
                    './www_dev/**/*.js',
                    './www_dev/**/*.scss',
                    './www_dev/**/*.css',
                    './www_dev/**/*.html',
                    '!./www_dev/index.html',
                    '!./www_dev/bundle.js',
                    '!./www_dev/bundle.css',
                    '!./www_dev/bower_components/**/*'
                ]
            }
        },


        dom_munger: {
            release: {
                options: {
                    read: [{
                        selector: 'script[src]',
                        attribute: 'src',
                        writeto: 'jsFiles',
                        isPath: true
                    }, {
                        selector: 'link',
                        attribute: 'href',
                        writeto: 'cssFiles',
                        isPath: true
                    }]
                },
                src: './www_dev/index.html'
            }
        },


        wiredep: {
            all: {
                src: [
                    './www_dev/index.html'
                ],

                dependencies: true,
                devDependencies: false
            }
        },


        jshint: {
            src: [
                'Gruntfile.js',
                './www_dev/**/*.js',
                '!./www_dev/bundle.js',
                '!./www_dev/bower_components/**/*.js'
            ],
            options: {
                jshintrc: './jshintrc.js'
            }
        },


        cssmin: {
            // Combine our own CSS files for debug builds
            debug: {
                minify: {
                    src: [
                        'www_dev/css/**/*.css'
                    ],
                    dest: 'www_dev/bundle.css',
                }
            },
            release: {
                minify: {
                    src: [
                    '<%= dom_munger.data.cssFiles %>',
                        './www_dev/css/**/*.css'
                    ],
                    dest: 'www/bundle.css',
                }
            }
        },


        uglify: {
            // Create release JS from script tags and browserified JS bundle
            release: {
                // mangle: true,
                options: {
                    beautify: false,
                    compress: {
                        drop_console: true
                    },
                    mangle: false,
                },
                files: {
                    './www/bundle.js': '<%= dom_munger.data.jsFiles %>'
                }
            }
        },


        lintspaces: {
            javascript: {
                src: [
                    './www_dev/**/*.js',
                    '!./www_dev/bower_components/**/*.js',
                    '!./www_dev/bundle.js'
                ],
                options: {
                    // TODO: Reference editorconfig
                    indentation: 'spaces',
                    spaces: 4,
                    newline: true,
                    trailingspaces: true,
                    ignores: ['js-comments']
                }
            }
        },


        copy: {
            release: {
                files: [{
                    cwd: './www_dev/',
                    src: [
                        // Anything you want copied to www goes here
                        './img/',
                        './fhconfig.json'
                    ],
                    dest: './www/',
                    expand: true,
                }]
            }
        },


        karma: {
            browsers: {
                configFile: './karma.conf.js'
            }
        },

        sass: {
            options: {
                outputStyle: 'compressed',
                imagePath: 'img'
            },
            files: [{
                expand: true,
                src: [
                    './www_dev/sass/**/*.scss'
                ],
                dest: './www_dev/css/',
                ext: '.css'
            }],
            debug: {
                options: {
                    sourceMap: true
                }
            },
            release: {}
        }
    });


    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-wiredep');
    grunt.loadNpmTasks('grunt-dom-munger');
    grunt.loadNpmTasks('grunt-lintspaces');
    grunt.loadNpmTasks('grunt-column-lint');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-browser-sync');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-browserify');


    // Run all unit tests
    grunt.registerTask('test', ['prepare:debug', 'karma']);

    // Code quality checks
    grunt.registerTask('format', ['lintspaces', 'jshint', 'column_lint']);

    // Serve files and watch for changes
    grunt.registerTask('serve', ['prepare:debug', 'browserSync', 'watch']);

    // Build debug files for ./www
    grunt.registerTask('prepare:debug', [
        'shell:bower-install',
        'browserify:debug',
        'wiredep:all',
        'sass:debug',
        'cssmin:debug:minify'
    ]);

    // Rebuilds for the serve task
    grunt.registerTask('rebuild', [
        'browserify:debug',
        'wiredep:all',
        'sass:debug',
        'cssmin:debug:minify'
    ]);

    // Build release files and write to /www
    grunt.registerTask('prepare:release', [
        'prepare:debug', // Debug src needs to be configured first
        'browserify:release',
        'dom_munger:release',
        'uglify:release',
        'sass:release',
        'cssmin:debug:minify',
        'copy:release'
    ]);

    grunt.registerTask('build', [
        'prepare:release',
        'shell:cordova'
    ]);
};
