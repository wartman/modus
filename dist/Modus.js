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
  this._value = (value || this._value);
  ctx = (ctx || this);
  var self = this;
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

// type-checking
var kind = {};
each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
  kind['is' + name] = function(obj) {
    return toString.call(obj) == '[object ' + name + ']';
  };
});

// Create an object, ensuring that every level is defined
// example:
//    foo.bar.baz -> (foo={}), (foo.bar={}), (foo.bar.baz={})
var createObjectByName = function (namespace, exports, env) {
  var cur = env || global
    , parts = namespace.split('.');
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
  var cur = env || global
    , parts = name.split('.');
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
//    Modus('myModule').import('foo.bar').export(function(){ });
//
Modus.map = function (path, provides) {
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
      .replace('**', "([\\s\\S]+?)") // ** matches any number of segments (will only use the first)
      .replace('*', "([^\\.|^$]+?)") // * matches a single segment (will only use the first)
      .replace(/\./g, "\\.")         // escape '.'
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
    throw new Error ('Cannot create a namespace with a reserved name: ' + name);
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

var Import = Modus.Import = function (items, module) {
  this.is = new Is();
  this._module = module;
  this._components = false;
  this._from = items;
  this._as = false;
  this._uses = false;
  this._inNamespace = false;
};

Import.prototype.from = function (module) {
  if (!module) return this._from;
  this._components = this._from;
  this._from = module;
  return this;
};

Import.prototype.as = function (alias) {
  if (!alias) return this._as;
  this._as = alias;
  return this;
};

Import.prototype.uses = function (plugin) {
  if (!plugin) return this._uses;
  this._uses = plugin;
  return this;
};

Import.prototype.load = function (next) {
  if (this.is.failed() || this.is.loaded()) return;
  this._from = this._ensureNamespace(this._from);
  var fromName = 'Modus.env.' + this._from;
  var self = this;
  if (getObjectByName(fromName)) {
    this._applyDependencies();
    next();
    return;
  }
  if (!this._uses) this._uses = 'script';
  // Pass to the modus loader.
  Modus.load(this._uses, this._from, function (err) {
    if (err) {
      self.is.failed(true);
      next(err);
      return;
    }
    self.is.loaded(true);
    self._applyDependencies();
    next();
  });
};

Import.prototype.getModule = function () {
  return getObjectByName('Modus.env.' + this._from);
};

Import.prototype.compile = function () {
  // do compile code.
};

Import.prototype._ensureNamespace = function (from) {
  if (from instanceof Array) {
    throw new TypeError('Module must be a string if "from" is not called: ' + typeof from);
  }
  if (!from) from = '';
  if (from.indexOf('.') === 0 && this._module) {
    this._inNamespace = from;
    return this._module.options.namespace + from;
  }
  return from;
};

Import.prototype._applyDependencies = function () {
  var fromName = 'Modus.env.' + this._from;
  var dep = getObjectByName(fromName);
  var module = this._module;
  if (Modus.shims.hasOwnProperty(this._from)) {
    dep = getObjectByName(this._from);
  }
  if (this._components instanceof Array) {
    each(this._components, function (component) {
      module[component] = dep[component];
    });
  } else if (this._components) {
    module[this._components] = dep[this._components];
  } else if (this._as) {
    module[this._as] = dep;
  } else {
    if (this._inNamespace) {
      createObjectByName('Modus.env.' + module.getFullName() + this._inNamespace, dep);
      return;
    }
    createObjectByName('Modus.env.' + module.getFullName() + '.' + this._from, dep);
  }
}

// --------------------
// Modus.Export

var Export = Modus.Export = function (name, factory, module) {
  this._name = name;
  this._module = module;
  this._definition = factory;
  this._value = {};
};

Export.prototype.getFullName = function () {
  return  this._module.getFullName() + '.' + this._name;
};

// Run the export. Will apply it directly to the module object in Modus.env.
Export.prototype.run = function () {
  if ('function' === typeof this._definition) {
    this._value = this._definition();
  } else {
    this._value = this._definition;
  }
  createObjectByName('Modus.env.' + this.getFullName(), this._value);
};

Export.prototype.compile = function () {
  // Do compile code.
};

// --------------------
// Modus.Namespace

var Namespace = Modus.Namespace = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._modules = [];
};

Namespace.prototype.options = {
  namespaceName: 'root'
};

Namespace.prototype.module = function (name, factory) {
  var module = new Modus.Module({
    namespace: this.getName(),
    moduleName: name
  });
  if (reservedName(name)) {
    throw new Error ('Cannot create a module with a reserved name: ' + name);
    return;
  }
  this._modules.push(module);
  createObjectByName('Modus.env.' + this.getName() + '.' + name, module);
  if (factory) { 
    factory(module);
    module.run();
  }
  return module;
};

Namespace.prototype.run = function () {
  if (this.is.pending()) {
    this._enableModules();
  } else if (this.is.enabled()) {
    this.wait.resolve();
  } else if (this.is.failed()) {
    this.wait.reject();
  }
};

Namespace.prototype.getName = function () {
  return this.options.namespaceName;
};

Namespace.prototype.compile = function () {
  // do compile code.
};

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
      self.is.failed(true);
      self.run();
    })
  });
};

// --------------------
// Modus.Module

var Module = Modus.Module = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._imports = [];
  this._exports = [];
};

Module.prototype.options = {
  namespace: 'root',
  moduleName: null
};

Module.prototype.imports = function (deps) {
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

Module.prototype.exports = function (name, factory) {
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

Module.prototype.getName = function () {
  return this.options.moduleName;
};

Module.prototype.getFullName = function () {
  return this.options.namespace + '.' + this.options.moduleName;
};

Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._checkDependencies();
  } else if (this.is.ready()) {
    this._enableExports();
  } else if (this.is.enabled()) {
    this.wait.resolve(this);
  } else if (this.is.failed()) {
    this.wait.reject();
  }
  return this;
};

Module.prototype.disable = function (reason) {
  this.is.failed(true);
  this.wait.reject(function () {
    throw new Error(reason)
  });
};

Module.prototype.compile = function () {
  // Run compile code here.
};

Module.prototype._loadImports = function () {
  var queue = []
  var remaining = 0;
  var self = this;
  this.is.working(true);
  each(this._imports, function (item) {
    if (!self.is.loaded()) queue.push(item);
  });
  remaining = queue.length;
  if (!remaining) {
    this.is.loaded(true);
    this.run();
    return;
  }
  each(queue, function (item) {
    item.load(function (err) {
      if (err) {
        self.disable(err);
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        self.is.loaded(true);
        self.run();
      }
    });
  });
};

Module.prototype._checkDependencies = function () {
  var self = this;
  if (this.is.ready() || this.is.enabled()) return;
  this.is.working(true);
  each(this._imports, function (item) {
    if (!self.is.working()) return;
    var module = item.getModule();
    if (Modus.shims.hasOwnProperty(item.from())) {
      if (!getObjectByName(item.from())) {
        self.disable('A shimmed import [' + item.from() + '] failed for: ' + self.getFullName() );
      }
    } else if (!module || module.is.failed()) {
      self.disable('An import [' + item.from() + '] failed for: ' + self.getFullName() );
    } else if (!module.is.ready() && !module.is.enabled()) {
      self.is.loaded(true);
      module.run().wait.done(function () { self.run(); });
      return true;
    }
  });
  if (!this.is.working()) return;
  this.is.ready(true);
  this.run();
};

Module.prototype._enableExports = function () {
  var self = this;
  this.is.working(true);
  each(this._exports, function (item) {
    try {
      item.run();
    } catch(e) {
      this.disable(e);
    }
  });
  if (!this.is.working()) return;
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