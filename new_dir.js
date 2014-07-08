// Basic import/export syntax:

import app.foo; // available as 'foo'
import app.ban as bix; //aliasing

var Bar = foo.Foo.extend({

  init: function () {
    this.frobaz = 'Forbulux';
  }

});

export Bar;

// Dynamic module loading:
Modus.config({
  namespaces: {
    'foo': '/foo'
  }
});

// Since foo is registered as a namespace, we can load
// modules in 'foo' without an import statement (so long
// as we use a fully qualified namespace). If Modus comes
// across a module it hasn't loaded while parsing, it just adds 
// it to the import stack.
var bin = foo.bar.banify('foo'); // Modus will figure that 'foo.bar' is the module here.
                                 // Honestly, this probably is way too complex, but whatever.

// Modus apps are started with a 'config.js' file that looks like 
// the following. The 'main' call will try to load the requested
// module and run it.
Modus.config({
  paths: {
    '$': 'bower_components/jquery'
  }
});

Modus.main('app.main');

// Modus compiles down to something like this:
Modus.module('app.bar', function (__import, __export) {
var foo = __import('app.foo'); // available as 'foo'
var bix = __import('app.ban'); //aliasing

var Bar = foo.Foo.extend({

  init: function () {
    this.frobaz = 'Forbulux';
  }

});

__export.Bar = Bar;
});

Modus.module('app.main', function(__import, __export) {
var bar = __import('app.bar');
// code
});

Modus.main('app.main');

// Note that order shouldn't matter in the compiled 
// script: nothing is executed until 'Modus.main' is
// called. The compiler sticks this call at the very
// end of the script, so it should always work fine.