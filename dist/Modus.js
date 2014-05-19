//!
// Modus 0.1.3
//
// Copyright 2014
// Released under the MIT license
//
// Date: 2014-05-19T17:12Z

(function (factory) {

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    var root = {};
    factory(root);
    module.exports = root.Modus;
  } else if (typeof window !== "undefined") {
    factory(window);
  }

}(function (root, undefined) {

"use strict"

// The main modus namespace
var Modus = root.Modus = {};

// Save the current version.
Modus.VERSION = '0.1.3';

// --------------------
// Modus helpers

// Get all keys from an object
var keys = function(obj) {
  if ("object" !== typeof obj) return [];
  if (Object.keys) return Object.keys(obj);
  var keys = [];
  for (var key in obj) if (_.has(obj, key)) keys.push(key);
  return keys;
};

// Get the size of an object
var size = function (obj) {
  if (obj == null) return 0;
  return (obj.length === +obj.length) ? obj.length : keys(obj).length;
};

// Iterator for arrays or objects. Uses native forEach if available.
var each = function (obj, callback, context) {
  if(!obj){
    return obj;
  }
  context = (context || obj);
  if(Array.prototype.forEach && obj.forEach){
    obj.forEach(callback)
  } else if ( obj instanceof Array ){
    for (var i = 0; i < obj.length; i += 1) {
      if (obj[i] && callback.call(context, obj[i], i, obj)) {
        break;
      }
    }
  } else {
    for(var key in obj){
      if(obj.hasOwnProperty(key)){
        if(key && callback.call(context, obj[key], key, obj)){
          break;
        }
      }
    }
  }
  return obj;
};

// Run through all items in an object, then trigger
// a callback on the last item.
var eachThen = function (obj, callback, last, error, context) {
  var remaining = size(obj);
  context = context || obj;
  each(obj, function (item) {
    callback(item, function () {
      remaining -= 1;
      if (remaining <= 0) {
        last.call(context);
      }
    }, error);
  }, context);
};

// Apply defaults to an object.
var defaults = function(defaults, options){
  if (!options) return defaults;
  for(var key in defaults){
    if(defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)){
      options[key] = defaults[key];
    }
  }
  return options;
};

// Extend an object
var extend = function (obj){
  each(Array.prototype.slice.call(arguments, 1), function(source){
    if(source){
      for(var prop in source){
        if (source.hasOwnProperty(prop)) obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

// A simple shim for `Function#bind`
var bind = function (func, ctx) {
  if (Function.prototype.bind && func.bind) return func.bind(ctx);
  return function () { func.apply(ctx, arguments); };
};

// Enxure things are loaded async.
var nextTick = ( function () {
  var fns = [];
  var enqueueFn = function (fn, ctx) {
    if (ctx) fn.bind(ctx);
    return fns.push(fn);
  };
  var dispatchFns = function () {
    var toCall = fns
      , i = 0
      , len = fns.length;
    fns = [];
    while (i < len) { toCall[i++](); }
  };
  if (typeof setImmediate == 'function') {
    return function (fn, ctx) { enqueueFn(fn, ctx) && setImmediate(dispatchFns) }
  }
  // legacy node.js
  else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
    return function (fn, ctx) { enqueueFn(fn, ctx) && process.nextTick(dispatchFns); };
  }
  // fallback for other environments / postMessage behaves badly on IE8
  else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
    return function (fn, ctx) { enqueueFn(fn, ctx) && setTimeout(dispatchFns); };
  } else {
    var msg = "tic!" + new Date
    var onMessage = function(e){
      if(e.data === msg){
        e.stopPropagation && e.stopPropagation();
        dispatchFns();
      }
    };
    global.addEventListener('message', onMessage, true);
    return function (fn, ctx) { enqueueFn(fn, ctx) && global.postMessage(msg, '*'); };
  }
})();

// Wait is a minnimal implementation of a promise-like class.
// Writing a full on, Promise/A+ complient module is a bit 
// overkill for what we need, so this does the trick.
var Wait = function(){
  this._state = 0;
  this._onReady = [];
  this._onFailed = [];
  this._value = null;
};

// Register callbacks to be run when resolved/rejected.
Wait.prototype.done = function(onReady, onFailed){
  var self = this;
  nextTick(function(){
    if(onReady && ( "function" === typeof onReady)){
      (self._state === 1)
        ? onReady.call(self, self._value)
        : self._onReady.push(onReady);
    }
    if(onFailed && ( "function" === typeof onFailed)){
      (self._state === -1)
        ? onFailed.call(self, self._value)
        : self._onFailed.push(onFailed);
    }
  });
  return this;
};

// Resolve the Wait
Wait.prototype.resolve = function(value, ctx){
  this._state = 1;
  this._dispatch(this._onReady, value, ctx);
  this._onReady = [];
};

// Reject the Wait.
Wait.prototype.reject = function(value, ctx){
  this._state = -1;
  this._dispatch(this._onFailed, value, ctx);
  this._onFailed = [];
};

// Helper to run callbacks.
Wait.prototype._dispatch = function (fns, value, ctx) {
  var self = this;
  this._value = (value || this._value);
  ctx = (ctx || this);
  each(fns, function(fn){ fn.call(ctx, self._value); });
};

// 'Is' manages states. You'll see it being used in most of 
// Modus' classes like 'this.is.pending()' or similar.
var STATES = {
  FAILED: -1,
  PENDING: 0,
  WORKING: 1,
  LOADED: 2,
  READY: 3,
  ENABLED: 4
};
var Is = function () {
  this._state = STATES.PENDING;
}
each(STATES, function (state, key) {
  Is.prototype[key.toLowerCase()] = function(set){
    if(set) this._state = state;
    return this._state === state;
  } 
});

// Create an object, ensuring that every level is defined
// example:
//    foo.bar.baz -> (foo={}), (foo.bar={}), (foo.bar.baz={})
var createObjectByName = function (namespace, exports, env) {
  var cur = env || global;
  var parts = namespace.split('.');
  for (var part; parts.length && (part = parts.shift()); ) {
    if(!parts.length && exports !== undefined){
      // Last part, so export to this.
      cur[part] = exports;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
  return cur;
}

// Convert a string into an object
var getObjectByName = function (name, env) {
  var cur = env || global;
  var parts = name.split('.');
  for (var part; part = parts.shift(); ) {
    if(typeof cur[part] !== "undefined"){
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;  
};

// Check if this is a path or an object name
var isPath = function (obj) {
  return obj.indexOf('/') >= 0;
};

// --------------------
// Modus

// --------------------
// Environment helpers

// 'env' holds modules.
Modus.env = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {}
};

// Set or get a Modus config option.
Modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      Modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ("undefined" === typeof Modus.options[key])? false : Modus.options[key];
  }
  if ( 'map' === key ) {
    return Modus.map(val);
  }
  Modus.options[key] = val;
  return Modus.options[key];
};

// Figure out what we're running Modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    Modus.config('environment', 'node');
  } else {
    Modus.config('environment', 'client');
  }
};

// Are we running Modus on a server?
var isServer = Modus.isServer = function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') === 'node'
    || Modus.config('environment') === 'server';
};

// Are we running Modus on a client?
var isClient = Modus.isClient =  function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') != 'node'
    && Modus.config('environment') != 'server';
};

// Map modules to a given path.
//
// example:
//    Modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
//    // You can also map a file to a base namespace
//    Modus.map('lib/foo.js', ['foo.*']);
//    // The following will now load lib/foo.js:
//    module.import('foo.bar');
//
Modus.map = function (path, provides) {
  // TODO: This method needs some love.
  if ("object" === typeof path){
    for ( var item in path ) {
      Modus.map(item, path[item]);
    }
    return;
  }
  if (!Modus.options.map[path]) {
    Modus.options.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      Modus.map(path, item);
    });
    return;
  }
  provides = new RegExp ( 
    provides
      // ** matches any number of segments (will only use the first)
      .replace('**', "([\\s\\S]+?)")
      // * matches a single segment (will only use the first)
      .replace('*', "([^\\.|^$]+?)") 
      // escapes
      .replace(/\./g, "\\.")
      .replace(/\$/g, '\\$')
      + '$'
  );
  Modus.options.map[path].push(provides);
};

// Get a mapped path
var getMappedPath = Modus.getMappedPath = function (module, root) {
  root = root || Modus.config('root');
  var src = module;
  each(Modus.config('map'), function (maps, pathPattern) {
    each(maps, function (map) {
      if (map.test(module)){
        src = pathPattern;
        var matches = map.exec(module);
        if (matches.length > 2) {
          src = src
            .replace('**', matches[1])
            .replace('*', matches[2]);
        } else if (matches.length === 2) {
          src = src.replace('*', matches[1]);
        }
      }
    });
  });
  if (src.indexOf('.js') < 0 && !isServer()) {
    src += '.js';
  }
  // Add root.
  src = root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = Modus.normalizeModuleName = function (name) {
  // Strip extensions
  if (name.indexOf('.') > 0) {
    name = name.substring(0, name.indexOf('.'));
  }
  // More???
  return name;
};

// Check if a module has been loaded.
var moduleExists = Modus.moduleExists = function (name) {
  console.log(name);
  name = normalizeModuleName(name);
  if (Modus.env.hasOwnProperty(name)) return true;
  return false;
};

// --------------------
// Primary API

// Module factory.
Modus.module = function (name, factory) {
  var module = new Modus.Module(name, {});
  if (factory) {
    factory(module);
    module.run();
  }
  return module;
};

// Shortcut to export a single value as a module.
Modus.publish = function (name, value) {
  return Modus.module(name, function (module) {
    module.exports(value);
  });
};

// --------------------
// Modus plugin

// Registered plugins.
Modus.plugins = {};

// Visted items
var pluginsVisited = {};

// Define or get a plugin.
//
// example:
//    // Define a plugin
//    Modus.plugin('foo', function(request, nexy, error) {
//      // code
//      // Always call next or error, or Modus will stall.
//      next();
//    });
//    // getting a plugin:
//    var plugin = Modus.plugin('foo');
//    plugin('foo.bar', next, error);
//    // Shortcut to run a plugin:
//    Modus.plugin('foo', 'foo.bar', next, error);
//    // Importing using a plugin:
//    module.imports('foo.bar').using('foo');
//
// You can wrap a plugin in a Modus Module and import it
// simply by passing the plugin name to 'imports([item]).using([plugin])'
//
// example:
//
//    // In 'plugins/foo.js':
//    Modus.namespace('plugins').module('foo', function(foo) {
//      foo.body(function (foo) {
//        // Note that you don't export anything: just define a
//        // plugin here.
//        // IMPORTANT: The plugin name MUST BE the same as the
//        // wrapping module or it will not work.
//        Modus('plugins.foo', function(request, next, error) {
//          // code
//          next(); 
//        });
//    });
//
//    // Using the plugin with 'imports':
//    // ... module code ...
//    module.imports('foo.bin').using('plugins.foo');
Modus.plugin = function (plugin, request, next, error) {
  if ("function" === typeof request && !(request instanceof Modus.Import)) {
    Modus.plugins[plugin] = request;
    return Modus.plugins[plugin];
  }
  if (!Modus.plugins.hasOwnProperty(plugin)) return false;
  if (request) {
    Modus.plugins[plugin](request, next, error);
  }
  return Modus.plugins[plugin];
};

// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

// Create a new import. [request] can be a path to a resource,
// a module name, or an array of components to import, depending
// on how you modify the import.
//
// example:
//    // Import the 'App/Foo' module.
//    module.imports('App/Foo'); 
//
//    // Import 'App/Foo' and alias it as 'bin'.
//    module.imports('App/Foo').as('bin');
//
//    // Import 'foo' and 'bar' from 'App/Foo'
//    module.imports(['foo', 'bar']).from('App/Foo');
//
//    // Import 'foo' and 'bar' fr 'App/Foo' and alias them.
//    module.imports({fooAlias:'foo', barAlias:'bar'}).from('App/Foo');
//
//    // Import a script and use the global it defines
//    module.imports('scripts/foo.js').global('foo');
var Import = Modus.Import = function (request, parent) {
  this.is = new Is();
  this._parent = parent;
  this._components = false;
  this._request = request;
  this._as = false;
  this._global = false;
  this._uses = false;
  this._inNamespace = false;
};

// Import components from the request.
Import.prototype.from = function (request) {
  if (!this._components) this._components = this._request;
  this._request = request;
  return this;
};

// Use an alias for this import. This will only work if
// you're importing a single item.
Import.prototype.as = function (alias) {
  this._as = alias;
  return this;
};

// Import using a plugin. This can point to an external
// file: modus will load it like any other module,
// then use the plugin defined there to resolve this
// import (see 'Modus.plugin' for some examples).
// Yoy can also pass a function here.
Import.prototype.using = function (plugin) {
  this._uses = plugin;
  return this;
};

// Load a script and import a global var. This method
// lets you import files that are not wrapped in a Modus.Module.
//
// example:
//    module.imports('bower_components/jquery/dist/jquery.min.js').global('$');
Import.prototype.global = function (item) {
  this._global = item;
  if (!this._as) this._as = item;
  return this;
};

// Get the mapped path and object name from the current request.
// Will return an object with 'src' and 'obj' keys.
Import.prototype.getRequest = function () {
  return getMappedPath(this._request, Modus.config('root'));
};

Import.prototype.getNormalizedRequest = function () {
  return normalizeModuleName(this._request);
}

// Get the parent module.
Import.prototype.getModule = function () {
  return this._parent;
};

// Retrieve the requested resource.
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error('Import failed');
  var self = this;
  var importError = function (reason) {
    self.is.failed(true);
    error(reason);
  }
  if (!this._parseRequest(importError)) return false;
  if (this.is.loaded() 
    || moduleExists(this._request)
    || (this._global && getObjectByName(this._global)) ) {
    this._enableImportedModule(next, importError);
    return;
  }
  // Handle the request with a plugin if defined.
  if (this._uses) {
    this._loadWithPlugin(next, importError);
    return;
  }
  // Otherwise, use the modus loader.
  Modus.load(this._request, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, importError);
  }, importError);
};

// Compile the import
// (to do)
Import.prototype.compile = function () {
  // do compile code.
};

// Ensure that the request is understandable by Modus
Import.prototype._parseRequest = function (error) {
  var request = this._request;
  if ('string' !== typeof request) {
    error('Request must be a string: ' 
      + typeof request);
    return false;
  }
  if (this._as && this._components) {
    error('Cannot use an alias when importing'
      + 'more then one component: ' + this._request);
    return false;
  }
  if (!request) this._request = '';
  // Handle namespace shortcuts (e.g. "module.imports('./foo')" )
  if (request.indexOf('.') === 0 && this._parent) {
    // Drop the starting './'
    this._inNamespace = request.substring(2);
    // Apply the parent's namespace to the request, droping the '.'
    // but keeping the '/'.
    this._request = this._parent.options.namespace + request.substring(1);
  }
  return true;
};

// Load using a plugin
Import.prototype._loadWithPlugin = function (next, error) {
  var self = this;
  if ('function' === typeof this._uses) {
    this._uses(this, function () {
      self.is.loaded(true);
      self._enableImportedModule(next, error);
    }, error);
    return;
  }
  if (false === Modus.plugin(this._uses)) {
    // Try to load the plugin from an external file
    Modus.load(this._uses, function () {
      // Ensure this is run after plugin has a chance
      // to define itself.
      nextTick(function () {
        if (false === Modus.plugin(self._uses)) {
          error('No plugin of that name found: ' + self._uses);
          return;
        }
        self._loadWithPlugin(next, error);
      });
    }, error);
    return;
  }
  Modus.plugin(this._uses, this, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, error);
  }, error);
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var moduleName = normalizeModuleName(this._request);
  var module = (moduleExists(moduleName))? Modus.env[moduleName] : false;
  var self = this;
  if (this._global) {
    if (!getObjectByName(this._global)) {
      error('A global import [' + this._global + '] failed for: ' 
        + this._parent.getFullName() );
      return;
    }
    this._applyDependencies();
    next();
  } else if (!module || module.is.failed()) {
    error('An import [' + this._request + '] failed for: ' 
      + this._parent.getFullName() );
  } else {
    module.wait.done(function () {
      self.is.ready();
      self._applyDependencies();
      next();
    }, error);
    module.run();
  }
};

// Apply imported components to the parent module.
Import.prototype._applyDependencies = function () {
  var module = this._parent.env;
  var moduleName = normalizeModuleName(this._request);
  var dep = (moduleExists(moduleName))? Modus.env[moduleName] : false;
  if (this._global) {
    dep = getObjectByName(this._global);
  } else {
    dep = dep.env;
  }
  if (this._components instanceof Array) {
    each(this._components, function (component) {
      module[component] = dep[component];
    });
  } else if ("object" === typeof this._components) {
    each(this._components, function (component, alias) {
      module[alias] = dep[component];
    });
  } else if (this._components) {
    module[this._components] = dep[this._components];
  } else if (this._as) {
    module[this._as] = dep;
  } else {
    var obj;
    if (this._inNamespace) {
      obj = normalizeModuleName(this._inNamespace).replace(/\//g, '.');
    } else {
      obj = normalizeModuleName(this._request).replace(/\//g, '.');
    }
    createObjectByName(obj, dep, module);
  }
}

// --------------------
// Modus.Export

// Handle an export for the parent module. [factory] passes 
// the current module's environment, letting you access previously
// imported and exported components for this module. You can
// define the module either by returning a value or by using
// a CommonJS-style '<module>.exports' syntax. If [factory] is
// not a funtion, it will define the current export directly.
//
// example:
//    foo.exports('foo', 'bar');
//    foo.exports('bar', function (foo) {
//      foo.bar; // === 'bar'
//      foo.exports = 'bin' // defines 'foo.bar'
//    });
//    foo.exports('baz', function (foo) {
//      foo.bar; // === 'bar'
//      foo.bar; // === 'bin'
//      return 'bin' // defines 'foo.baz'
//    });
var Export = Modus.Export = function (name, factory, module, options) {
  if (!(module instanceof Modus.Module)) {
    options = module || {};
    module = factory;
    factory = name;
    name = false;
  }
  this.options = defaults(this.options, options);
  this.is = new Is();
  this._name = name;
  this._module = module;
  this._definition = factory;
  this._value = false;
};

Export.prototype.options = {
  isBody: false
};

Export.prototype.getFullName = function () {
  return  (this._name)
    ? this._module.getFullName() + '.' + this._name
    : this._module.getFullName();
};

// Run the export. Will apply it directly to the module object in Modus.env.
Export.prototype.run = function () {
  if (this.is.enabled() || this.is.failed()) return;
  var self = this;
  // Run export
  if ('function' === typeof this._definition) {
    if (this.options.isBody) this._module.env.exports = {};
    this._value = this._definition(this._module.env);
  } else {
    this._value = this._definition;
  }
  if (this.options.isBody) {
    // Check for exports.
    if (size(this._module.env.exports) > 0 || ("object" !== typeof this._module.env.exports) ) {
      if (this._module.env.exports.hasOwnProperty('exports')) {
        throw new Error('Cannot export a component nammed \'exports\' for module: ' + this._module.getFullName());
      }
      this._value = this._module.env.exports;
      delete this._module.env.exports;
    }
  }
  // Apply to module
  if (this._name) {
    this._module.env[this._name] = this._value;
  } else if ("object" === typeof this._value) {
    each(this._value, function (value, key) {
      self._module.env[key] = value;
    });
  } else if (this._value) {
    // Define the root module.
    this._module.env = extend(this._value, this._module.env);
  }
  self.is.enabled(true);
};

Export.prototype.compile = function () {
  // Do compile code.
};

// --------------------
// Modus.Module
//
// The core of Modus.

var Module = Modus.Module = function (name, options) {
  this.options = defaults({
    namespace: false,
    moduleName: null,
    throwErrors: true
  }, options);
  this.wait = new Wait();
  this.is = new Is();
  this.env = {};
  this._body = false;
  this._imports = [];
  this._exports = [];
  this._modules = [];
  // Parse the name.
  this._parseName(name);
  // Register self with Modus
  console.log(this.getFullName(), this.options);
  Modus.env[this.getFullName()] = this;
};

// Define a sub-namespace
//
// example: 
//    (to do)
Module.prototype.namespace = function (name, factory) {
  var namespace = this.module(name, factory, {namespace: true});
  return namespace;
};

// Define a sub-module
//
// example: 
//    (to do)
Module.prototype.module = function (name, factory, options) {
  options = (options || {});
  var self = this;
  var module = new Modus.Module(name, {
    namespace: self.getFullName(),
  });
  this._modules.push(module);
  if (factory) factory(module);
  nextTick(function () {
    self.is.pending(true);
    self.run();
  });
  return module;
};

// Import a dependency into this module.
//
// example:
//    module.import('foo.bar').as('bar');
//    module.import(['foo', 'bin']).from('foo.baz');
//
// Imported dependencies will be available as properties
// in the current module.
//
// example:
//    module.import(['foo', 'bin']).from('foo.baz');
//    module.body(function () {
//      module.foo(); // from foo.baz.foo
//      module.bin(); // frim foo.baz.bin
//    });
Module.prototype.imports = function (deps) {
  this.is.pending(true);
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

// Export a component to this module using [factory].
//
// You should wrap all code that uses imported
// dependencies in an export method. 
//
// example:
//    module.exports('foo', function (module) {
//      var thing = module.importedThing();
//      // Set an export by returning a value
//      return thing;
//    });
//    module.exports('fid', function (module) {
//      // Set a value using CommonJS like syntax.
//      module.exports.foo = "foo";
//      module.exports.bar = 'bar';
//    });
//
// You can also export several components in one go
// by skipping [name] and returning an object from [factory]
//
// example:
//    module.exports(function (module) {
//      return {
//        foo: 'foo',
//        bar: 'bar'
//      };
//    });
Module.prototype.exports = function (name, factory) {
  if (!this.options.moduleName) {
    throw new Error('Cannot export from a namespace: ', this.getFullName());
    return;
  }
  if (!factory) {
    factory = name;
    name = false;
  }
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

// Register a function to run after all imports and exports
// are complete. Unlike `Module#exports`, the value returned
// from the callback will NOT be applied to the module. Instead,
// you can define things diretly, by adding a property
// to the passed variable, or by using the special 'exports'
// property, which works similarly to Node's module system.
//
// Can only be called once per module.
//
// example:
//    foo.imports('foo.bar').as('importedFoo');
//    foo.exports('bin', 'bin');
//    foo.body(function (foo) {
//      foo.bin; // === 'bin'
//      foo.bar = 'bar'; // Set items directly.
//      // Use exports to set the root of this module.
//      // This WILL NOT overwrite previously exported properties.
//      foo.exports = function() { return 'foo'; };
//    });
Module.prototype.body = function (factory) {
  if (!this.options.moduleName) {
    throw new Error('Cannot export from a namespace: ', this.getFullName());
    return;
  }
  if (this._body) {
    this._disable('Cannot define [body] more then once: ', this.getFullName());
    return;
  }
  this._body = new Modus.Export(factory, this, {isBody: true});
  return this;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.namespace || !this.options.namespace.length)
    return this.options.moduleName;
  return this.options.namespace + '/' + this.options.moduleName;
};

// Run the module. The action taken will differ depending
// on the current state of the module.
Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enable();
  } else if (this.is.ready() || this.is.enabled()) {
    this.is.enabled(true);
    this.wait.resolve(this);
  } else if (this.is.failed()) {
    this.wait.reject();
  }
  return this;
};

// Get the namespace from the passed name.
Module.prototype._parseName = function (name) {
  console.log(name, this.options);
  var namespace = this.options.namespace || '';
  name = normalizeModuleName(name);
  if (name.indexOf('/') > 0) {
    if (namespace.length) namespace += '/';
    namespace += name.substring(0, name.lastIndexOf('/'));
    name = name.substring(name.lastIndexOf('/') + 1);
  }
  console.log(namespace, name);
  this.options.moduleName = name;
  this.options.namespace = namespace;
};

// Disable the module. A disabled module CANNOT be re-enabled.
Module.prototype._disable = function (reason) {
  var self = this;
  this.is.failed(true);
  this.wait.done(null, function (e) {
    if (self.options.throwErrors && e instanceof Error) {
      throw e
    }
  });
  this.wait.reject(reason);
};

// This will be used by the Modus compiler down the road.
Module.prototype._compile = function () {
  // Run compile code here.
};

// Iterate through imports and run them all.
Module.prototype._loadImports = function () {
  if (this.is.failed()) return;
  var self = this;
  this.is.working(true);
  if (!this._imports.length) {
    this.is.loaded(true);
    this._enable();
    return;
  }
  eachThen(this._imports, function (item, next, error) {
    if (item.is.loaded()) return next();
    item.load(next, error);
  }, function () {
    self.is.loaded(true);
    self._enable();
  }, function (reason) {
    self._disable(reason);
  });
};

// Enable this module, defining all exports.
Module.prototype._enable = function () {
  if (this.is.failed()) return;
  var self = this;
  this.is.working(true);
  this._enableModules(function () {
    self._enableExports(function () {
      self.is.enabled(true);
      self.run();
    });
  });
};

// Iterate through exports and run them.
Module.prototype._enableExports = function (next) {
  if (!this._exports.length) {
    if (this._body) this._body.run();
    return next();
  }
  var self = this;
  eachThen(this._exports, function (item, next, error) {
    if (item.is.enabled()) return next();
    try {
      item.run();
      next();
    } catch(e) {
      error(e);
    }
  }, function () {
    if (self._body) self._body.run();
    next();
  }, function (e) {
    self._disable(e);
  });
};

// Enable all modules.
Module.prototype._enableModules = function (next) {
  if (!size(this._modules)) return next();
  var self = this;
  eachThen(this._modules, function (module, next, error) {
    module.run();
    module.wait.done(next, function () {
      error(key);
    });
  }, next, function (id) {
    self._disable('The module [' + id + '] failed for: ' + self.getFullName());
  });
};

if (isClient()) {

  // A collection of previously visited scripts.
  // Used to ensure that scripts are only requested once.
  var visited = {};

  // Test for the load event the current browser supports.
  var onLoadEvent = (function (){
    var testNode = document.createElement('script')
    if (testNode.attachEvent){
      return function(script, wait){
        script.attachEvent('onreadystatechange', function () {
          if(/complete|loaded/.test(script.readyState)){
            wait.resolve();
          }
        });
        // Can't handle errors with old browsers.
      }
    }
    return function(script, wait){
      script.addEventListener('load', function (e) {
        wait.resolve();
      }, false);
      script.addEventListener('error', function (e) {
        wait.reject();
      }, false);
    }
  })();

  // Load a script. This can only be used for JS files, 
  // if you want to load a text file or do some other AJAX
  // request you'll need to write a plugin (see the 'examples'
  // folder for inspiration).
  Modus.load = function (module, next, error) {

    if (module instanceof Array) {
      eachThen(module, function (item, next, error) {
        Modus.load(item, next, error);
      }, next, error);
      return;
    }

    var src = getMappedPath(module, Modus.config('root'));

    // If the script is already loading, add the callback
    // to the queue and don't load it again.
    if (visited.hasOwnProperty(src)) {
      visited[src].done(next, error);
      return;
    }

    // Set up script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.setAttribute('data-module', module);
    script.src = src;

    // Add to DOM
    var entry = document.getElementsByTagName('script')[0];
    entry.parentNode.insertBefore(script, entry);

    // Add event listener
    visited[src] = new Wait();
    visited[src].done(next, error);
    onLoadEvent(script, visited[src]);
  };

}
if (isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.load = function (module, next, error) {
    if (module instanceof Array) {
      eachThen(module, function (item, next, error) {
        Modus.load(item, next, error);
      }, next, error);
      return;
    }
    var src = getMappedPath(module, Modus.config('root'));
    try {
      require(src);
      nextTick(function () {
        next();
      });
    } catch(e) {
      nextTick(function () {
        error(e);
      });
    }
  };

}
}));