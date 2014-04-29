
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