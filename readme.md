modus
=====
A lightweight module loader for browsers.

About modus
---------
modus is a modular script loader and compiler for browsers. It can be compared to
more robust options like requireJs, but differs in that it loads modules based on
namespaces (which are just javascript objects, such as 'app.foo.bar'), not filepaths.
The advantage of this is that a project can be compiled into a single file without
needing any extra code (such as 'require' wrappers); in fact, a compiled modus project
won't have a single line of code from the modus library.

If you need lots of AMD stuff on your projects, modus is likely not the way to go. However,
it might be ideal for smaller apps. If you need to use popular libraries like Backbone, jQuery
or Underscore you can import them into modus with minimal trouble.

How does it work?
-----------------
modus uses a simple API to manage dependencies. A module is written as follows:

    
    modus('app.module')
        .imports('app.my.dependency')
        .imports('app.my.otherDependency')
        .exports(function(){
            
            var Foo = function(){
                return "foo";
            }

            var Bar = app.my.dependency;

            return {
                Foo: Foo,
                Bar: Bar
            };

        });


Modules can also be defined via callbacks (which is the recommended method):

    
    modus('app.module', function (imports, exports) {

    imports('app.my.dependency');
    imports('app.my.otherDependency');

    exports(function(){
        
        var Foo = function(){
            return "foo";
        }

        var Bar = app.my.dependency;

        return {
            Foo: Foo,
            Bar: Bar
        };

    });

    });


modus comes with a command-line tool that can be used to compile projects. First, install
modus globally:


    $ npm install modus -g


You can then use modus anywhere to compile projects:

    
    $ modus build <path/to/main.js> <path/to/compiledApp.js>


The compiled file can be optimized by as well, just include the '-o' option
when building a project:
    

    $ modus build <path/to/main.js> <path/to/compiledApp.js> -o


modus requires a 'main' file to properly compile a project. This is where you'll include
all your configuration options and where you'll include your first modules. Here's an example:

    
    modus.config({
        root: '/scripts',
        // You can name your main module anything you like, just include the following in the config.
        // By default, modus assumes the main module is called 'main'.
        main: 'app.main',
        // Use the shim to set up non-modus modules.
        shim: {
            '$': {
                map: 'libs/jquery.min.js'
            },
            '_': {
                map: 'libs/underscore.js'
            },
            'Backbone': {
                map: 'libs/backbone.js',
                imports: ['_', '$'] // Including this option will ensure that backbone has underscore and jquery
            }
        },
        map: {
            // You can use patterns to map namespaces to filepaths.
            // The following will, for example, match 'foo.bar' to 'libs/foo/bar.js'
            'libs/foo/*.js': 'foo.*',
            // If you want to map an entire directory, use '**'.
            // The following will, for example, match 'baz.bif.bin.bar' to 'libs/baz/bif/bin/bar.js'
            'libs/baz/**/*.js': 'baz.**.*',
            // It's also possible to tell modus that one file exports several modules.
            // Patterns will work here!
            'libs/bar.js': [
                'bar.bin',
                'bar.foo',
                'bar.fid.*'
            ]
        }
    });

    modus('app.main', function (imports, exports) {

    imports('app.boot');

    exports(function () {
        app.boot();
    });

    });


More detailed instructions are coming, but the code is fairly well commented if you're curious. Give it a read!