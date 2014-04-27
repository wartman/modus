/*!
 * modus 0.1.0
 *
 * Copyright 2014
 * Released under the MIT license
 *
 * Date: 2014-04-27T16:46Z
 */

(function (global, factory) {

  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // For CommonJS environments.
    module.exports = factory;
  } else {
    factory(global);
  }

}( typeof window !== "undefined" ? window : this, function (global, undefined) {

/**
 * ------------------------------------------
 * Helpers
 */

/**
 * Ensure async loading.
 *
 * @param {Function} fn Run this function async
 * @param {Object} ctx Set 'this'
 */
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

/**
 * Iterate over arrays or objects.
 *
 * @param {*} obj
 * @param {Function} callback
 * @param {Object} context (optional)
 */
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

/**
 * A super stripped down promise-like thing.
 *
 * @constructor
 */
var wait = function(){
  this._state = 0;
  this._onReady = [];
  this._onFailed = [];
  this._value = null;
}

/**
 * Run when done waiting.
 *
 * @param {Function} onReady Add to the onReady queue
 * @param {Function} onFailled Add to the onFailed queue
 * @return {wait} 
 */
wait.prototype.done = function(onReady, onFailed){
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

/**
 * Resolve the wait.
 *
 * @param {*} value Value to pass to callbacks
 * @param {Object} ctx Set 'this'
 */
wait.prototype.resolve = function(value, ctx){
  this._state = 1;
  this._dispatch(this._onReady, value, ctx);
  this._onReady = [];
}

/**
 * Reject the wait.
 *
 * @param {*} value Value to pass to callbacks
 * @param {Object} ctx Set 'this'
 */
wait.prototype.reject = function(value, ctx){
  this._state = -1;
  this._dispatch(this._onFailed, value, ctx);
  this._onFailed = [];
}

/**
 * Helper to run callbacks
 *
 * @param {Array} fns
 * @param {*} value
 * @param {Object} ctx
 * @api private
 */
wait.prototype._dispatch = function (fns, value, ctx) {
  this._value = (value || this._value);
  ctx = (ctx || this);
  var self = this;
  each(fns, function(fn){ fn.call(ctx, self._value); });
}

/**
 * ------------------------------------------
 * Api
 */

/**
 * The module factory.
 *
 * @example
 *   modus('app.main').imports('app.foo').exports(function () { return app.foo; });
 *
 * @constructor
 * @param {String} name - Assign a namespace to this module.
 * @param {Function} factory - Define a namespace via callback.
 * @return {Object}
 */
var modus = function (name, factory) {

  // Allows the use of modus without 'new'
  if( !(this instanceof modus) ) return new modus(name, factory);

  // Register the namespace (or throw an error if already defined)
  modus.ensureNamespace(name);  
  // Register this module
  modus.env.modules[name] = this;

  this._wait = new wait();
  this._state = modus.env.MODULE_STATE.PENDING;
  this._moduleName = name;
  this._definition = false;
  this._dependencies = [];
  this._plugins = {};
  this._factory = null;

  // Export the namespace if the name isn't prefixed by '@'
  if (!name.indexOf('@') >= 0) modus.createObjectByName(name);


  if(factory && ('function' === typeof factory) ){
    if(factory.length < 2){
      this.exports(factory);
    } else {
      factory(this.imports.bind(this), this.exports.bind(this));
    }
  }
}

/**
 * ------------------------------------------
 * Static Methods/Properties
 */

/**
 * modus's environment
 */
modus.env = {
  namespaces: {},
  root: '',
  map: {},
  shim: {},
  modules: {},
  plugins: {},
  pluginPattern: /([\s\S]+?)\!/,
  environment: false,
  VERSION: '0.1.0',
  MODULE_STATE: {
    PENDING: 0,
    LOADED: 1,
    ENABLING: 2,
    ENABLED: 3,
    FAILED: -1
  }
};

/**
 * Set a config item/items
 *
 * @param {String|Object} key
 * @param {Mixed} val
 */
modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ( modus.env[key] || false );
  }
  if ( 'map' === key ) {
    return modus.map(val);
  } else if ( 'shim' === key ) {
    return modus.shim(val);
  }
  modus.env[key] = val;
  return modus.env[key];
}

/**
 * Map modules to a given path.
 *
 * @example
 *    modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
 *    // You can also map a file to a base namespace
 *    modus.map('lib/foo.js', ['foo.*']);
 *    // The following will now load lib/foo.js:
 *    modus('myModule').import('foo.bar').export(function(){ });
 *
 * @param {String} path Should be a fully-qualified path.
 * @param {Array} provides A list of modules this path provides.
 */
modus.map = function (path, provides) {
  if ("object" === typeof path){
    for ( var item in path ) {
      modus.map(item, path[item]);
    }
    return;
  }
  if (!modus.env.map[path]) {
    modus.env.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      modus.map(path, item);
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
  modus.env.map[path].push(provides);
}

/**
 * Shim a module. This will work with any module that returns
 * something in the global scope.
 *
 * @param {String} module
 * @param {Object} options
 */
modus.shim = function (module, options) {
  if ("object" === typeof module){
    for ( var item in module ) {
      modus.shim(item, module[item]);
    }
    return;
  }
  options = options || {}; 
  if (options.map) {
    modus.map(options.map, module);
  }
  var mod = modus('@shim.' + module);
  if (options.imports) {
    each(options.imports, function (item) {
      mod.imports(item);
    });
  }
  mod.exports(function () {
    return '';
  });
  modus.env.shim[module] = options;
}

/**
 * Register a plugin.
 *
 * @param {Strign} name
 * @param {Function} callback (Will use modus as 'this') 
 */
modus.plugin = function (name, callback) {
  if ( "function" === typeof callback ) {
    modus.env.plugins[name] = callback.bind(modus);
  }
}

/**
 * Check if a namespace has been defined.
 *
 * @param {String} namespace
 */
modus.namespaceExists = function (namespace) {
  return ( modus.env.namespaces.hasOwnProperty(namespace)
    && modus.env.namespaces[namespace] !== undefined );
}

/**
 * Register a namespace. This won't actually create a javascript object --
 * use createObjectFromName for this. This is just used to ensure overwrites
 * are caught.
 *
 * @param {String} namespace
 */
modus.ensureNamespace = function (namespace) {
  // Raise an error if a namespace is redefined
  if(modus.namespaceExists(namespace)){
    throw Error('Namespace was already defined: ' + namespace);
  }
  delete modus.env.namespaces[namespace];

  while ( (namespace = namespace.substring(0, namespace.lastIndexOf('.'))) ) {
    if(modus.namespaceExists(namespace) || namespace.indexOf('@') >= 0){
      break;
    }
    modus.env.namespaces[namespace] = true;
  }
}

/**
 * Check if a module is mapped to a path.
 *
 * @param {String} module
 * @return {String | Bool}
 */
modus.getMappedPath = function (module) {
  var mappedPath = false;
  each(modus.env.map, function (maps, path) {
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
}

/** 
 * Create a namespace path, ensuring that every level is defined
 * @example
 *    foo.bar.baz -> (foo={}), (foo.bar={}), (foo.bar.baz={})
 *
 * @param {String} namespace
 */
modus.createObjectByName = function (namespace, exports, env) {
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

/**
 * Convert a string into a namespace
 *
 * @param {String} name
 * @param {Object} env (optional)
 */
modus.getObjectByName = function (name, env) {
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

modus.checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    modus.config('environment', 'node');
  } else {
    modus.config('environment', 'client');
  }
};

/**
 * Are we running modus on a server?
 */
modus.isServer = function () {
  if (!modus.config('environment')) modus.checkEnv();
  return modus.env.environment === 'node'
    || modus.env.environment === 'server';
};

/**
 * Are we running modus on a client?
 */
modus.isClient = function () {
  if (!modus.config('environment')) modus.checkEnv();
  return modus.env.environment != 'node'
    && modus.env.environment != 'server';
};

/**
 * ------------------------------------------
 * Instance Methods
 */

/**
 * Import a module
 *
 * @param {String} module
 * @return {modus}
 */
modus.prototype.imports = function (module) {
  if ( modus.env.pluginPattern.test(module) ) {
    var parts = module.match(modus.env.pluginPattern);
    module = module.replace(parts[0], '');
    this._plugins[module] = parts[1];
  }
  this._dependencies.push(module);
  return this;
}

/**
 * Define this module when all dependencies are ready.
 *
 * @param {Function} factory
 * @return {modus}
 */
modus.prototype.exports = function (factory) {
  var self = this;
  this._factory = factory;
  nextTick(function(){
    self.enable();
  });
  return this;
}

/**
 * Enable this module.
 *
 * @return {modus}
 */
modus.prototype.enable = function () {
  if (this.isPending()) {
    this.getDependencies();
  } else if (this.isLoaded()) {
    this.runFactory();
  } else if (this.isFailed()) {
    this._wait.reject();
  } else if (this.isEnabled()) {
    this._wait.resolve();
  }
  return this;
}

/**
 * Callbacks to run when the module has finished loading dependencies
 *
 * @param {Function} onReady
 * @param {Function} onFailed
 * @return {modus}
 */
modus.prototype.done = function (onReady, onFailed) {
  this._wait.done(onReady, onFailed);
  return this;
}

/**
 * Callbacks to run on an error.
 * Alias for modus.prototype.done(null, {Function})
 *
 * @param {Function} onFailed
 * @return {modus}
 */
modus.prototype.catch = function (onFailed) {
  this.done(null, onFailed);
  return this;
}

/**
 * Mark this module as failed.
 *
 * @param {String} reason
 * @throws {Error}
 * @return {modus}
 */
modus.prototype.disable = function (reason) {
  this.isFailed(true);
  this.catch(function(){
    nextTick(function(){
      throw Error(reason);
    })
  });
  return this.enable();
}

/**
 * Iterate through deps and load them.
 *
 * @return {modus}
 */
modus.prototype.getDependencies = function () {
  var queue = []
    , self = this
    , len = this._dependencies.length;

  each(this._dependencies, function(item){
    if (!modus.getObjectByName(item)) queue.push(item);
  });

  len = queue.length;
  var remaining = len;

  if(len > 0){
    each(queue, function(item){
      var loader = global.MODUS_MODULE_LOADER;
      if ( self._plugins[item] ) {
        loader = modus.env.plugins[self._plugins[item]];
      }
      loader(item, function(){
        remaining -= 1;
        if(remaining <=0 ){
          self.isLoaded(true);
          self.enable();
        }
      }, function(reason){
        self.disable('Could not load dependency: ' + item);
      });
    });
  } else {
    this.isLoaded(true);
    this.enable();
  }

  return this;
}

/**
 * Run the factory, making sure dependncies have been enabled.
 *
 * @api private
 */
modus.prototype.runFactory = function () {
  var self = this;

  if (this.isEnabled() || this.isEnabling()) return;

  this.isEnabling(true);

  each(this._dependencies, function ensureDependency (module) {
    if (!self.isEnabling()) return;

    var current = modus.env.modules[module];

    if (modus.env.shim.hasOwnProperty(module)){
      if(!modus.getObjectByName(module)) {
        self.disable('A shimmed module could not be loaded: [' + module + '] for module: ' + self._moduleName);
      }
    } else if (!modus.env.modules.hasOwnProperty(module)) {
      console.log(module, current);
      self.disable('A dependency was not loaded: [' + module + '] for module: ' + self._moduleName);
    } else if (current.isFailed()) {
      self.disable('A dependency failed: ['+ module + '] for module: ' + self._moduleName);
    } else if (!current.isEnabled()) {
      // Set this module as loaded, but not enabling.
      self.isLoaded(true);
      // Wait for the dependency to enable, then try again.
      current.enable().done(function () { self.enable(); });
    }
  });

  if (!this.isEnabling()) return;

  this.isEnabled(true);

  // Don't define the namespace twice.
  if (this._definition) return;

  if (!this._factory) {
    this.disable('No factory defined: ' + this._moduleName);
    return;
  }

  if (modus.isClient()) {
    // Don't export modules prefixed by '@' to a global var. This is mostly used by 
    // shimmed modules, as they'll typically define their own global variable.
    if(this._moduleName.indexOf('@') >= 0) {
      this._factory();
      this._definition = true;
    } else {
      modus.createObjectByName(this._moduleName, this._factory());
      this._definition = modus.getObjectByName(this._moduleName);
    }
  }

  if (modus.isServer()) {
    // Don't run factories in a node env.
    this._factory = this._factory.toString();
    this._definition = true;
  }

  this.enable();
}

/**
 * Set up methods for checking the module state.
 */
each(['Enabled', 'Enabling', 'Loaded', 'Pending', 'Failed'], function ( state ) {
  var modState = modus.env.MODULE_STATE[state.toUpperCase()];
  /**
   * Check module state.
   *
   * @param {Boolean} state If true, will set the state.
   * @return {Boolean}
   */
  modus.prototype['is' + state] = function(set){
    if(set) this._state = modState;
    return this._state === modState;
  } 
});

/* 
 * -------
 * Globals
 * -------
 */

if(!global.MODUS_MODULE_LOADER && modus.isClient()){

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

  /**
   * The default module loader.
   *
   * @param {String} module The module to load. This should be the
   *    module name, not a filepath (e.g., 'app.foo.bar')
   * @param {Function} next Run on success
   * @param {Funtion} error Run on error
   */
  global.MODUS_MODULE_LOADER = function (module, next, error) {
    var src = modus.env.root + ( modus.getMappedPath(module)
      || module.replace(/\./g, '/') + '.js' );

    if (visited.hasOwnProperty(src)) {
      visited[src].done(next, error);
      return;
    }

    var node = document.createElement('script')
      , head = document.getElementsByTagName('head')[0];

    node.type = 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    node.setAttribute('data-module', module);

    visited[src] = new wait();
    visited[src].done(next, error);

    onLoadEvent(node, visited[src]);

    node.src = src;
    head.appendChild(node);
  }

  /**
   * The default file loader (uses AJAX)
   *
   * @param {String} file The file to load
   * @param {String} type The type of file to load (eg, 'txt' or 'json')
   *    Defaults to 'json'.
   * @param {Function} next Run on success
   * @param {Funtion} error Run on error
   */
  global.MODUS_FILE_LOADER = function (file, type, next, error) {

    if (arguments.length < 4) {
      error = next;
      next = type;
      type = 'txt'; 
    }

    var src = modus.env.root + ( modus.getMappedPath(file)
      || file.replace(/\./g, '/') + '.' + type )

    if(visited.hasOwnProperty(src)){
      visited[src].done(next, error);
      return;
    }

    visited[src] = new wait();
    visited[src].done(next, error);

    if(global.XMLHttpRequest){
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
  }

  /**
   * Default file plugin.
   */
  modus.plugin('txt', function (module, next, error) {
    global.MODUS_FILE_LOADER(module, 'txt', function (data) {
      modus(module).exports( function () { return data; } ).done(next);
    }, error);
  });

}

// Export modus.
modus.global = global;
global.modus = global.modus || modus;

}));