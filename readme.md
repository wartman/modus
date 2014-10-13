Modus
=====

Modus is a JavaScript module loader for the web. It uses a Python and 
ES6 inspired syntax, but can also load AMD modules.

Getting Started
---------------

Modus is available using [bower](http://bower.io/) or [npm](http://npmjs.com).
It's recommended you use one of them to manage your dependencies.

```
$ bower install --save modus
$ npm install --save modus
```

Let's quickly run through a simple 'hello world' app. Install modus and jquery using
bower in a new directory, then create an 'index.html' file that looks like the 
following:

```html
<!doctype html>
  
<html>

  <head>
    <title>Hello, world.</title>
    <script src="bower_components/modus/dist/modus-min.js" data-main='scripts.module'></script>
  </head>

  <body>
    <div id="target"></div>
  </body>

</html>
```

Next, you'll need to write a file called `scripts/main.js`:

```javascript
modus.main({
  // The first argument of `modus.main` should be an object-literal
  // that contains configuration options for your project.
  // The first option is the 'root' path for your scripts. Modus will
  // try to infer this from `data-main` by default, but you can
  // set it manually if you wish.
  root: 'scripts/',
  // `maps` let you map long paths to shorter module names. Some libraries,
  // such as jQuery, actually require you to do this.
  maps: {
    'jquery': 'bower_components/jquery/jquery.min.js'
  },
  // You can also map namespace shortcuts to longer paths.
  namespaceMaps: {
    'lib': '/some/long/unwieldly/path'
  }
}, function () {
  // The second argument is a module factory. We'll talk more
  // about this in a second. For now, let's just import our first
  // module:
  this.imports('app.foo');
  this.foo.start();
});
```

Our main module needs to import a module called 'app.foo'. Lets write
another file, 'foo.js', and place it in the 'scripts/app' directory.

When writing modules, we use the `modus.module` method to wrap our module. To save 
you a little typing, `modus.module` is aliased as the global `module` or `mod`. Use 
whichever strikes your fancy. For this readme, we'll be using `module`.

```javascript
module(function () {
  // Let's import jquery.
  this.imports('jquery');

  var module = this;

  // The main module expects the `app.foo` module to have a 'start' method,
  // so lets write that now. To export a property or method, all we need to
  // do is apply it to 'this'.
  this.start = function () {
    module.jquery('#target').html('Hello World!');
  };
});
```

If you run your little app, you should see a cheery 'Hello World!'.

Advanced
--------

Let's break down the above a bit more. First off, let's look at these
lines from the `main` module:

```javascript
  this.imports('app.foo');
  this.foo.start();
```

As you may have guessed, modus tries to automatically name imports by using
the last segment (segments meaning words separated by dots) in the module's name
('foo', in this case). If you want to use a different name, you can set it with `imports(<module>).as(<alias>)`:

```javascript
  this.imports('app.foo').as('bar');
  this.bar.start();
```

Really though, all we need is the 'start' method from 'app.foo'. We
can import specific properties or methods from modules using `imports(<methods>).from(<module>)`:

```javascript
  this.imports('start').from('app.foo');
  this.start();
```

You can import as many properties as you want using this pattern:

```javascript
  this.imports('start', 'stop', 'foo', 'bar').from('app.foo');
  this.start();
  this.stop();
  // etc.
```

Let's move on to the 'app.foo' module. Note these lines:

```javascript
  var module = this;
  this.start = function () {
    module.jquery('#target').html('Hello World!');
  };
```

Rather then writing out `var module = this` whenever you need to use
an import in another scope, modus passes the current module as the first
argument to a module factory. Here's the 'app.foo' module rewritten:

```javascript
module(function (module) {
  module.imports('jquery');
  module.start = function () {
    module.jquery('#target').html('Hello World!');
  };
});
```

License Junk
------------
Released under the [MIT license](LICENSE-MIT).

