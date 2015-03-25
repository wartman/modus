/*!
  Modus 0.4.0
  
  Copyright 2015
  Released under the MIT license
  
  Date: 2015-03-25T20:13Z
*/

(function (root) {

// Utility Functions
// =================

// Simple inheritance
var inherits = (function () {
  if (Object.create) {
    return function (dest, src) {
      dest.prototype = Object.create(src.prototype);
      dest.prototype.constructor = dest;
    };
  } else {
    var Proxy = function () {};
    return function (dest, src) {
      Proxy.prototype = src.prototype;
      dest.prototype = new Proxy();
      dest.prototype.constructor = dest;
      Proxy.prototype = null;
    };
  }
})();

// Iterator for arrays or objects. Uses native forEach if available.
var each = function (obj, fn, ctx) {
  if (!ctx) ctx = obj;
  if (Array.prototype.forEach && obj.forEach) {
    obj.forEach(fn, ctx);
  } else if (obj instanceof Array) {
    for (var i = 0; i < obj.length; i += 1) {
      fn.call(ctx, obj[i], i, obj);
    }
  } else {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) fn.call(ctx, obj[key], key, obj);
    }
  }
  return obj;
};

// Extend an object
// NOTE: Look into removing this.
var extend = function (obj) {
  each(Array.prototype.slice.call(arguments, 1), function (source) {
    if (source) {
      for (var prop in source) {
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

// Clone an object
var clone = function (obj) {
  if ('object' !== typeof obj) return obj;
  return (obj instanceof Array) ? obj.slice() : extend({}, obj);
};

// Path
// ====
// Simple path helpers. Based in the node.js source-code.
var path = {};

// Resolves . and .. elements in a path array. There must
// be no slashes, empty elements or device names (c:\) in the array.
// This includes leading and trailing slashes.
var _normalizeArray = function (parts, allowAboveRoot) {
  // If the path goes above the root, `up` is > 0
  var up = 0;
  // Iterate through the array, moving up relative paths as needed.
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }
  // If the path is allowed to go above the root, restore
  // the leading `..`
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }
  return parts;
};

// Resolve a relative path
path.resolve = function (/* ..args */) {
  var resolvedPath = '';
  var resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var pathname = (i>=0) ? arguments[i] : '';
    // Skip empty or invalid entries.
    if (!pathname) continue;
    resolvedPath = pathname + '/' + resolvedPath;
    resolvedAbsolute = pathname.charAt(0) === '/';
  }
  // Normalize the path.
  resolvedPath = _normalizeArray(resolvedPath.split('/').filter(function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');
  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// Normalize a path.
path.normalize = function (pathname) {
  var isAbsolute = path.isAbsolute(pathname);
  var trailingSlash = pathname[pathname.length - 1] === '/';
  var segments = pathname.split('/');
  var nonEmptySegments = [];
  for (var i = 0; i < segments.length; i++) {
    if (segments[i]) {
      nonEmptySegments.push(segments[i]);
    }
  }
  pathname = _normalizeArray(nonEmptySegments, !isAbsolute).join('/');
  if (!pathname && !isAbsolute) pathname = '.';
  if (pathname && trailingSlash) pathname += '/';
  return (isAbsolute ? '/' : '') + pathname;
};

// Check if this is an absolute path.
path.isAbsolute = function (pathname) {
  return pathname.charAt(0) === '/';
};

// Get the directory of the current path.
path.dirname = function(pathname) {
  var dir = pathname.substring(0, Math.max(pathname.lastIndexOf('/')));
  if (!dir) return '.';
  return dir;
};

// EventEmitter
// ============
// A simple event-system.
var EventEmitter = function () {
  // no-op  
};

EventEmitter.prototype.addListener = function (event, fn) {
  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = [];
  this._events[event].push(fn);
  return this;
};

EventEmitter.prototype.once = function (event, fn) {
  var _this = this;
  var proxy = function () {
    _this.removeListener(event, proxy);
    fn.apply(this, arguments);
  };
  this.addListener(event, proxy);
  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.removeListener = function (event, fn) {
  if (!this._events) return this;
  if (!this._events[event]) return this;
  if (!fn) {
    delete this._events[event];
    return this;
  }
  this._events[event].splice(this._events[event].indexOf(fn), 1);
  return this;
};

EventEmitter.prototype.emit = function (event /*, ..args */) {
  if (!this._events) return this;
  if (!this._events[event]) return this;
  var args = Array.prototype.slice.call(arguments, 1);
  for (var i = 0, len = this._events[event].length; i < len; i++) {
    this._events[event][i].apply(this, args);
  }
};

// ScriptLoader
// ============
// Loads modules using the `<scripts>` tag.
var ScriptLoader = function () {
  this._visited = {}; 
};

// Get a visit if one exists
ScriptLoader.prototype.getVisit = function(pathName) {
  return this._visited[pathName];
};

// Add a visit
ScriptLoader.prototype.addVisit = function(pathName, cb) {
  this._visited[pathName] = true;
  return this;
};

ScriptLoader.prototype.createScriptTag = function (scriptPath) {
  var script = document.createElement("script");
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.setAttribute('data-module', scriptPath);
  script.src = scriptPath + '.js';
  return script;
};

ScriptLoader.prototype.insertScript = function (script, next) {
  var head = document.getElementsByTagName("head")[0] || document.documentElement;
  var done = false;
  script.onload = script.onreadystatechange = function () {
    console.log('onLoad triggered');
    if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      // First arg === error, second should be this script's `src`
      next(null, script.src);
      // Handle memory leak in IE
      script.onload = script.onreadystatechange = null;
    }
  };
  head.insertBefore(script, head.firstChild).parentNode;
};

ScriptLoader.prototype.load = function(pathName, next) {
  var _this = this;
  if (this.getVisit(pathName)) {
    next(null, pathName);
    return this;
  }
  this.addVisit(pathName);
  var script = this.createScriptTag(pathName);
  this.insertScript(script, next);
  return this;
};

// Constants to determine the module's state
var MODULE_STATE = {
  DISABLED: -1,
  PENDING: 0,
  ENABLING: 1,
  READY: 2,
};

// Module
// ======
// The core of modus, `Module` handles dependency management.
var Module = function (name, factory, modusInstance) {
  this._modus = modusInstance || root.modus; // Default to the root instance.
  this._dependencies = [];
  this._exports = {};
  this._env = {};
  this._state = MODULE_STATE.PENDING;
  this
    .setName(name)
    .setFactory(factory);
};

inherits(Module, EventEmitter);

Module.prototype.setName = function (name) {
  if (name) {
    name = path.normalize(name);
    this._name = path.isAbsolute(name) ? name : path.resolve(name); 
  }
  return this;
};

Module.prototype.getName = function() {
  return this._name;
};

Module.prototype.getParentDir = function() {
  return path.resolve(this.getName(), '../');
};

Module.prototype.setFactory = function (factory) {
  this._factory = factory;
  return this;
};

Module.prototype.getFactory = function() {
  return this._factory;
};

Module.prototype.runFactory = function(next) {
  var env = this.createEnv();
  if (this._factory.length === 2) {
    this._factory.call(env, env, next);
  } else {
    this._factory.call(env, env);
    next(null);
  }
  return this;
};

// RegExps to find dependencies.
var _importRegExp = [
  /\.from\(\s*["']([^'"\s]+)["']\s*\)/g,
  /\.imports\(\s*["']([^'"\s]+)["']\s*\)(?!\.from)/g,
  // /require\s*\(\s*["']([^'"\s]+)["']\s*\)/g
];

// RegExp to remove comments, ensuring that we don't try to
// import things that have been commented out.
var _commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

Module.prototype.findDependencies = function () {
  if (!this._factory) return this._dependencies;
  var _this = this;
  var factory = this._factory.toString().replace(_commentRegExp, '');
  each(_importRegExp, function (re) {
    factory.replace(re, function (matches, dep) {
      _this.addDependency(dep);
    });
  });
  return this._dependencies;
};

Module.prototype.addDependency = function (name) {
  this._dependencies.push(name);
  return this;
};

Module.prototype.getDependencies = function () {
  return this._dependencies;
};

// Get the exports list, cloning it so it won't be
// modified.
Module.prototype.getExports = function () {
  return clone(this._exports);
};

Module.prototype.createEnv = function () {
  this._env.imports = this.createImporter();
  this._env.exports = this.createExporter();
  return this._env;
};

Module.prototype.applyToEnv = function(props, relativePath) {
  var fullPath = path.resolve(this.getParentDir(), relativePath);
  var mod = this._modus.getModule(fullPath);
  if (!mod) return; // Probably mishandling a property request.
  var modExports = mod.getExports();
  var _this = this;
  if (props instanceof Array) {
    each(props, function (prop) {
      _this._env[prop] = modExports[prop];
    });
  } else {
    _this._env[props] = modExports['default'] || modExports;
  }
};

// Create an `imports` function for use inside the module environment.
Module.prototype.createImporter = function () {
  var _this = this;
  return function (/* ...args */) {
    var props = Array.prototype.slice.call(arguments, 0);
    var alias, retValue;
    if (props[0] instanceof Array) props = props[0];
    if (props.length === 1) {
      // Auto-create the name.
      var modPath = props[0];
      alias = modPath.split('/').pop();
      retValue = _this._env[alias];
      _this.applyToEnv(alias, modPath);
    }

    return {

      from: function (modPath) {
        if (alias) _this._env[alias] = retValue;
        console.log('Loading', modPath);
        _this.applyToEnv(props, modPath);
      },

      as: function (newAlias) {
        if (alias) _this._env[alias] = retValue;
        _this.applyToEnv(newAlias, modPath);
      }

    }
  }
};

Module.prototype.createExporter = function () {
  var _this = this;
  return function (name, target) {

    if (arguments.length === 1) {
      _this._exports['default'] = arguments[0]
    } else {
      _this._exports[name] = target;
    }

    return {
      as: function (name) {
        _this._exports[name] = target
      }
    }
  }
};

// Run the factory
Module.prototype.enable = function () {
  if (this._state === MODULE_STATE.READY) {
    this.emit('ready');
    return;
  }
  if (this._state !== MODULE_STATE.PENDING) return;
  var _this = this;
  var onReady = function (err) {
    if (err) {
      _this._state = MODULE_STATE.DISABLED;
      _this.emit('disabled');
      return;
    }
    _this._state = MODULE_STATE.READY;
    _this.emit('ready');
  }
  var deps = this.findDependencies();
  if (!deps.length) {
    this._state = MODULE_STATE.ENABLING;
    this.runFactory(onReady);
    return;
  } else {
    this._state = MODULE_STATE.ENABLING;
    this._modus.loadModules(this.getParentDir(), deps, function (err) {
      if (!err) _this.runFactory(onReady);
    });
  }
};

// Modus API
// =========
var Modus = function (loader) {
  this._config = {
    'auto enable': true,
    'root path': window ? window.location.origin : ''
  };
  this._modules = {};
  // Default to the ScriptLoader.
  this._loader = loader || new ScriptLoader();
};

inherits(Modus, EventEmitter);

// Modify the configuration of Modus.
Modus.prototype.config = function (key, value) {
  var attrs = key;
  if ('object' != typeof key) {
    attrs = {};
    attrs[key] = value;
  }
  each(attrs, function (value, key) {
    this._config[key] = value;
  }, this);
  return this;
};

Modus.prototype.getConfig = function(key) {
  return this._config[key];
};

// Create a new module.
Modus.prototype.createModule = function (name, factory) {
  if (!factory) {
    factory = name;
    name = null;
  }
  var mod = new Module(name, factory, this);
  console.log('creating', name);
  if (name) this.addModule(mod.getName(), mod);
  if (this._config['auto enable'] && name) 
    mod.enable();
  else
    this._lastModule = mod;
  return mod;
};

Modus.prototype.addModule = function(name, mod) {
  this._modules[name] = mod;
  return this;
};

Modus.prototype.getModule = function (name) {
  return this._modules[name];
};

Modus.prototype.getLastAddedModule = function () {
  var mod = this._lastModule;
  delete this._lastModule;
  return mod;
};

// Using the current 'Loader', require all provided modules
// then run `cb` once all emit a `ready` event.
Modus.prototype.loadModules = function (relPath, paths, cb) {
  console.log('loading', paths);
  if (!cb) {
    cb = paths;
    paths = relPath;
    relPath = this.getConfig('root path');
  }
  if (!relPath) relPath = this.getConfig('root path');
  if (!(paths instanceof Array)) paths = [paths];
  var progress = paths.length;
  var loader = this._loader;
  var _this = this;
  // Keep running until `progress` is 0.
  var onReady = function () {
    progress -= 1;
    console.log(progress);
    if (progress <= 0) cb(null);
  };
  each(paths, function (modPath) {
    var fullPath = path.resolve(relPath, modPath);
    var mod = this.getModule(fullPath);
    if (mod) {
      mod.once('ready', onReady).enable();
    } else {
      loader.load(fullPath, function (err, modName) {
        console.log(err, modName);
        if (err) throw err;
        mod = _this.getModule(fullPath);
        if (!mod) {
          // Handle anon modules.
          mod = _this.getLastAddedModule();
          if (!mod) throw new Error('No module loaded for path ' + fullPath);
          mod.setName(fullPath);
          console.log('anon mod found', mod.getName());
          _this.addModule(mod.getName(), mod);
        }
        mod.once('ready', onReady).enable();
      })
    }
  }, this);
};

// Create default context.
root.modus = new Modus();

root.modus.VERSION = '0.4.0';

// Define the 'mod' shortcut.
var _lastModule = root.mod;
root.mod = bind(root.modus.createModule, root.modus);
root.mod.noConflict = function () {
  var mod = root.mod;
  root.mod = _lastMod;
  return mod;
};

})(this);