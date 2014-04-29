//!
// Modus @VERSION
//
// Copyright 2014
// Released under the MIT license
//
// Date: @DATE

(function (factory) {

  var global = {};

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    global = module.exports;
  } else if (typeof window !== "undefined") {
    global = window;
  }
  
  factory(global);

}(function (global, undefined) {

"use strict"

// The main modus namespace
var Modus = global.Modus = {};

// Save the current version.
Modus.VERSION = '@VERSION';

// --------------------
// Modus helpers

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
}

// Apply defaults to an object.
var defaults = function(defaults, options){
  if (!options) return defaults;
  for(var key in defaults){
    if(defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)){
      options[key] = defaults[key];
    }
  }
  return options;
}

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
}

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
}

// Resolve the Wait
Wait.prototype.resolve = function(value, ctx){
  this._state = 1;
  this._dispatch(this._onReady, value, ctx);
  this._onReady = [];
}

// Reject the Wait.
Wait.prototype.reject = function(value, ctx){
  this._state = -1;
  this._dispatch(this._onFailed, value, ctx);
  this._onFailed = [];
}

// Helper to run callbacks.
Wait.prototype._dispatch = function (fns, value, ctx) {
  var self = this;
  this._value = (value || this._value);
  ctx = (ctx || this);
  each(fns, function(fn){ fn.call(ctx, self._value); });
}

var reservedNames = [
  'imports',
  'exports',
  'module',
  'namespace'
];
var reservedName = function (name) {
  return reservedNames.indexOf(name) >= 0;
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

// Figure out what we're running Modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    Modus.config('environment', 'node');
  } else {
    Modus.config('environment', 'client');
  }
};

// Are we running Modus on a server?
var isServer = function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') === 'node'
    || Modus.config('environment') === 'server';
};

// Are we running Modus on a client?
var isClient = function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') != 'node'
    && Modus.config('environment') != 'server';
};

// --------------------
// Modus

// 'env' holds all registered modules and namespaces.
Modus.env = {};

// 'shims' holds references to shimmed modules.
Modus.shims = {};

// Holds various loader plugins.
Modus.plugins = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {},
  shim: {}
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
  } else if ( 'shim' === key ) {
    return Modus.shim(val);
  }
  Modus.options[key] = val;
  return Modus.options[key];
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

// Shim a module. This will work with any module that returns
// something in the global scope.
Modus.shim = function (name, options) {
  if ("object" === typeof name){
    for ( var item in name ) {
      Modus.shim(item, name[item]);
    }
    return;
  }
  options = options || {}; 
  if (options.map) {
    Modus.map(options.map, name);
  }
  Modus.shims[name] = options;
};

// Aliases to environment helpers.
Modus.isServer = isServer;
Modus.isClient = isClient;

// Namespace factory.
Modus.namespace = function (name, factory) {
  var namespace;
  var namespaceEnv = 'Modus.env.' + name;

  if (reservedName(name)) {
    throw new Error ('Cannot create a namespace'
      + 'with a reserved name: ' + name);
    return;
  }
  if (getObjectByName(namespaceEnv)) {
    namespace = getObjectByName(namespaceEnv);
  } else {
    namespace = new Modus.Namespace({
      namespaceName: name
    });
    createObjectByName(namespaceEnv, namespace);
  }
  if (factory) {
    factory(namespace);
    namespace.run();
  }
  return namespace;
};

// Module factory. Will create a new module in the 'root' namespace.
Modus.module = function (name, factory) {
  return Modus.namespace('root').module(name, factory);
};

// Load a request.
Modus.load = function (plugin, module, next) {
  if (!Modus.plugins.hasOwnProperty(plugin)) {
    next(Error('Plugin does not exist: ' + plugin));
    return;
  }
  Modus.plugins[plugin].run(module, next);
};

// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

// Create a new import. [request] can be several things,
// depening on how you modify the import later. To explain
// this, here are some examples:
//
// example:
//    // finds the 'app.foo' module. Avilable as 'module.app.foo'
//    module.imports('app.foo'); 
//    // Imports 'app.foo' and aliases it as 'bin'.
//    // Available as 'module.bin'.
//    module.imports('app.foo').as('bin');
//    // Finds 'foo' and 'bar' from 'app.foo'
//    // Available as 'module.foo' and 'module.bar'
//    module.imports(['foo', 'bar']).from('app.foo');
//    // Imports 'foo' and 'bar' for 'app.foo' and aliases them.
//    // Available as 'module.fooAlias' and 'module.barAlias'
//    module.imports({fooAlias:'foo', barAlias:'bar'}).from('app.foo');
var Import = Modus.Import = function (request, module) {
  this.is = new Is();
  this._module = module;
  this._components = false;
  this._request = request;
  this._as = false;
  this._uses = false;
  this._inNamespace = false;
};

// Import components from the request.
Import.prototype.from = function (request) {
  if (!request) return this._request;
  if (!this._components) this._components = this._request;
  this._request = request;
  return this;
};

// Use an alias for this import. This will only work if
// you're importing a single item.
Import.prototype.as = function (alias) {
  if (!alias) return this._as;
  this._as = alias;
  return this;
};

// Import using the plugin.
Import.prototype.uses = function (plugin) {
  if (!plugin) return this._uses;
  this._uses = plugin;
  return this;
};

// Import the module, passing the request on to the
// appropriate Modus.Loader if needed. 
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error();
  try {
    this._ensureNamespace();
  } catch(e) {
    error(e);
    return;
  }
  var fromName = 'Modus.env.' + this._request;
  var self = this;
  var importError = function (reason) {
    self.is.failed(true);
    error(reason);
  }
  if (this.is.loaded() || getObjectByName(fromName)) {
    this._enableImportedModule(next, importError);
    return;
  }
  if (!this._uses) this._uses = 'script';
  // Pass to the modus loader.
  Modus.load(this._uses, this._request, function (err) {
    self.is.loaded(true);
    if (err) return importError();
    self._enableImportedModule(next, importError);
  });
};

Import.prototype.compile = function () {
  // do compile code.
};

// Ensure that the request is a full namespace.
Import.prototype._ensureNamespace = function (error) {
  var request = this._request
  if ('string' !== typeof request) {
    throw new TypeError('Request must be a string: ' 
      + typeof request);
  }
  if (this._as && this._components) {
    throw new Error('Cannot use an alias when importing'
      + 'more then one component: ' + this._request);
  }
  if (!request) this._request = '';
  if (request.indexOf('.') === 0 && this._module) {
    // Drop the starting '.'
    this._inNamespace = request.substring(1);
    this._request = this._module.options.namespace + request;
  }
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var module = getObjectByName(this._request, Modus.env);
  var self = this;
  if (Modus.shims.hasOwnProperty(this._request)) {
    if (!getObjectByName(this._request)) {
      error('A shimmed import [' + this._request + '] failed for: ' 
        + this._module.getFullName() );
      return;
    }
    this._applyDependencies();
    next();
  } else if (!module || module.is.failed()) {
    error('An import [' + this._request + '] failed for: ' 
      + this._module.getFullName() );
  } else {
    module.wait.done(function () {
      self.is.ready();
      self._applyDependencies();
      next();
    }, error);
    module.run();
  }
};

// Apply requested components to the parent module.
Import.prototype._applyDependencies = function () {
  var dep = getObjectByName(this._request, Modus.env);
  var module = this._module;
  if (Modus.shims.hasOwnProperty(this._request)) {
    dep = getObjectByName(this._request);
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
    if (this._inNamespace) {
      createObjectByName(this._inNamespace, dep, module);
      return;
    }
    createObjectByName(this._request, dep, module);
  }
}

// --------------------
// Modus.Export

var Export = Modus.Export = function (name, factory, module) {
  if (arguments.length < 3) {
    module = factory;
    factory = name;
    name = false;
  }
  this.is = new Is();
  this._name = name;
  this._module = module;
  this._definition = factory;
  this._value = {};
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
  if ('function' === typeof this._definition) {
    this._value = this._definition();
  } else {
    this._value = this._definition;
  }
  if (this._name) {
    createObjectByName(this._name, this._value, this._module);
  } else {
    if ("object" !== typeof this._value) {
      throw new Error('Unnamed exports must return an object: ' + typeof this._value);
      return;
    }
    each(this._value, function (value, key) {
      createObjectByName(key, value, self._module);
    });
  }
  self.is.enabled(true);
};

Export.prototype.compile = function () {
  // Do compile code.
};

// --------------------
// Modus.Namespace
//
// Namespaces are to modules as modules are to exports in Modus.
// Use Namespaces to group related modules together.

var Namespace = Modus.Namespace = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._modules = [];
  this._imports = [];
};

Namespace.prototype.options = {
  namespaceName: 'root'
};

// Define a module in this namespace.
//
// example:
//    Modus.namespace('foo').module('bar', function (bar) {
//      // For convinience, you can import other modules in
//      // the same namespace like this:
//      bar.imports('.bin'); // imports from 'foo.bin'
//      // Import from other namespaces with a full path.
//      bar.imports('Baz').from('bar.baz');
//      bar.body(function () {
//        // code
//      });
//    });
Namespace.prototype.module = function (name, factory) {
  var module = new Modus.Module({
    namespace: this.getName(),
    moduleName: name
  });
  if (reservedName(name)) {
    throw new Error ('Cannot create a module with'
      + ' a reserved name: ' + name);
    return;
  }
  this._modules.push(module);
  createObjectByName('Modus.env.' + this.getName() 
    + '.' + name, module);
  if (factory) { 
    factory(module);
    module.run();
  }
  return module;
};

// Import a module to use in all this Namespace's modules.
Namespace.prototype.imports = function (deps) {
  this.is.pending(true);
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

// Run the namespace, depending on its state.
Namespace.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enableModules();
  } else if (this.is.ready() || this.is.enabled()) {
    this.wait.resolve();
  } else if (this.is.failed()) {
    this.wait.reject();
  }
};

// Disable the namespace.
Namespace.prototype.disable = function (reason) {
  this.is.failed(true);
  this.wait.reject(reason);
}

// Get the namespace's name.
Namespace.prototype.getName = function () {
  return this.options.namespaceName;
};

// Same as above: needed in some functions.
Namespace.prototype.getFullName = function () {
  return this.options.namespaceName;
};

// To be used by Modus' compiler.
Namespace.prototype.compile = function () {
  // do compile code.
};

// Collect all imports (uses Module's method)
Namespace.prototype._loadImports = function () {
  Modus.Module.prototype._loadImports.call(this);
};

// Enable all modules.
Namespace.prototype._enableModules = function () {
  var remaining = this._modules.length;
  var self = this;
  if (!remaining) return;
  this.is.working(true);
  each(this._modules, function (module) {
    module.run();
    module.wait.done(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.enabled(true);
        self.run();
      }
    }, function () {
      self.disable('A module failed');
    });
  });
};

// --------------------
// Modus.Module
//
// The core of Modus.

var Module = Modus.Module = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._body = false;
  this._imports = [];
  this._exports = [];
};

Module.prototype.options = {
  namespace: 'root',
  moduleName: null,
  throwErrors: true
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
//    })
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
//    module.exports('foo', function () {
//      var thing = module.importedThing();
//      return thing;
//    });
//    module.exports('fid', function () {
//      this.foo = "foo";
//      this.bar = 'bar';
//    });
//
// You can also export several components in one go
// by skipping [name] and returning an object from [factory]
//
// example:
//    module.exports(function () {
//      return {
//        foo: 'foo',
//        bar: 'bar'
//      };
//    });
Module.prototype.exports = function (name, factory) {
  if (!factory) {
    factory = name;
    name = false;
  }
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

// Synatic sugar for wrapping code that needs to be run
// after the module has collected all its imports, but 
// either doesn't export anything, or defines several of the
// module's exports. Will always be run last, after any 
// export calls.
//
// Can only be called once per module.
//
// example:
//    module.imports('foo.bar').as('importedFoo');
//    module.body(function () {
//      module.importedFoo();
//    });
//    // or:
//    module.body(function () {
//      plus.exports({
//        foo: module.importedFoo,
//        bar: 'bar'
//      });
//    });
Module.prototype.body = function (factory) {
  if (this._body) {
    this.disable('Cannot define [body] more then once: ', this.getFullName);
    return;
  }
  this._body = factory;
  return this;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  return this.options.namespace + '.' + this.options.moduleName;
};

// Run the module. The action taken will differ depending
// on the current state of the module.
Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enableExports();
  } else if (this.is.ready() || this.is.enabled()) {
    this.is.enabled(true);
    this.wait.resolve(this);
  } else if (this.is.failed()) {
    this.wait.reject();
  }
  return this;
};

// Disable the module. A disabled module CANNOT be re-enabled.
Module.prototype.disable = function (reason) {
  var self = this;
  this.is.failed(true);
  this.wait.done(null, function (e) {
    if (self.options.throwErrors) throw e;
  });
  this.wait.reject(reason);
};

// This will be used by the Modus compiler down the road.
Module.prototype.compile = function () {
  // Run compile code here.
};

// Iterate through imports and run them all.
Module.prototype._loadImports = function () {
  var remaining = this._imports.length;
  var self = this;
  this.is.working(true);
  if (!remaining) {
    this.is.loaded(true);
    this.run();
    return;
  }
  each(this._imports, function (item) {
    item.load(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.loaded(true);
        self.run();
      }
    }, function (reason) {
      self.disable(reason);
    });
  });
};

// Iterate through exports and run them.
Module.prototype._enableExports = function (ranBody) {
  var self = this;
  this.is.working(true);
  each(this._exports, function (item) {
    if (item.is.enabled()) return;
    try {
      item.run();
    } catch(e) {
      self.disable(e);
    }
  });
  if (!this.is.working()) return;
  if (this._body && !ranBody) {
    this._body();
    this._enableExports(true);
  }
  this.is.enabled(true);
  this.run();
};


// --------------------
// Modus.Loader

var Loader = Modus.Loader = function (handler) {
  this.wait = new Wait();
  this.is = new Is();
  this._handler = null;
  if (handler) this.handler(handler);
};

Loader.prototype.handler = function (handler) {
  this._handler = function () {
    handler.apply(this, arguments);
  };
};

Loader.prototype.run = function (module, next) {
  this._handler(module, next);
};

Loader.prototype._getMappedPath = function (module) {
  var mappedPath = false;
  each(Modus.config('map'), function (maps, path) {
    each(maps, function (map) {
      if (map.test(module)){
        mappedPath = path;
        var matches = map.exec(module);
        // NOTE: The following doesn't take ordering into account.
        // Could pose an issue for paths like: 'foo/*/**.js'
        // Think more on this. Could be fine as is! Not sure what the use cases are like.
        if (matches.length > 2) {
          mappedPath = mappedPath
            .replace('**', matches[1].replace(/\./g, '/'))
            .replace('*', matches[2]);
        } else if (matches.length === 2) {
          mappedPath = mappedPath
            .replace('*', matches[1]);
        }
      }
    });
  });
  return mappedPath;
};
if (Modus.isClient()) {

  var visited = {};

  var onLoadEvent = (function (){
    var testNode = document.createElement('script')
    if (testNode.attachEvent){
      return function(node, wait){
        var self = this;
        this.done(next, err);
        node.attachEvent('onreadystatechange', function () {
          if(node.readyState === 'complete'){
            wait.resolve();
          }
        });
        // Can't handle errors with old browsers.
      }
    }
    return function(node, wait){
      node.addEventListener('load', function (e) {
        wait.resolve();
      }, false);
      node.addEventListener('error', function (e) {
        wait.reject();
      }, false);
    }
  })();

  Modus.plugins.script = new Modus.Loader(function (module, cb) {
    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.js' );
    var error = function (e) { cb(e); };

    if (visited.hasOwnProperty(src)) {
      visited[src].done(cb, error);
      return;
    }

    var node = document.createElement('script')
      , head = document.getElementsByTagName('head')[0];

    node.type = 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    node.setAttribute('data-module', module);

    visited[src] = new Wait();
    visited[src].done(cb, error);

    onLoadEvent(node, visited[src]);

    node.src = src;
    head.appendChild(node);
  });

  Modus.plugins.file = new Modus.Loader(function(file, cb) {

    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.' + this.options.type );
    var error = function (e) { cb(e); };
    var next = function (data) {
      Modus.module(file, function (file) {
        file.exports('contents', function (contents) {
          contents = data;
        });
        file.wait.done(next, error);
      });
    };

    if(visited.hasOwnProperty(src)){
      visited[src].done(next, error);
      return;
    }

    visited[src] = new Wait();
    visited[src].done(next, error);

    if (global.XMLHttpRequest) {
      var request = new XMLHttpRequest();
    } else { // code for IE6, IE5
      var request = new ActiveXObject("Microsoft.XMLHTTP");
    }

    request.onreadystatechange = function(){
      if(4 === this.readyState){
        if(200 === this.status){
          visited[src].resolve(this.responseText);
        } else {
          visited[src].reject(this.status);
        }
      }
    }

    request.open('GET', src, true);
    request.send();
  });

}
if (Modus.isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.plugins.script = new Modus.Loader(function (module, cb) {
    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.js' );
    try {
      require(src);
      cb();
    } catch(e) {
      cb(e);
    }
  });

  Modus.plugins.file = new Modus.Loader(function (file, cb) {
    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.' + this.options.type );
    var fs = require('fs');
    fs.readFile(src, function (err, data) {
      if (err) return cb(err);
      Modus.module(file, function (file) {
        file.exports('contents', function (contents) {
          contents = data;
        });
        file.wait.done(cb);
      });
    })
  });

}
}));