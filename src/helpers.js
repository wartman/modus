

// Internal helpers
// ================

// Ensure async loading.
var nextTick = ( function () {
  var fns = [];
  var enqueueFn = function (fn, ctx) {
    if (ctx) bind(fn, ctx);
    return fns.push(fn);
  };
  var dispatchFns = function () {
    var toCall = fns
      , i = 0
      , len = fns.length;
    fns = [];
    while (i < len) { 
      toCall[i++]();
    }
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
    root.addEventListener('message', onMessage, true);
    return function (fn, ctx) { enqueueFn(fn, ctx) && root.postMessage(msg, '*'); };
  }
})();

// A super stripped down promise-like thing.
var Wait = function(){
  this._state = 0;
  this._onReady = [];
  this._onFailed = [];
  this._value = null;
};

// Run when done waiting.
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

// Resolve the Wait.
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

// Helper to run callbacks
Wait.prototype._dispatch = function (fns, value, ctx) {
  this._value = (value || this._value);
  ctx = (ctx || this);
  var self = this;
  each(fns, function(fn){ fn.call(ctx, self._value); });
};

// Get all the keys in an object.
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

// Iterate over arrays or objects.
var each = function (obj, callback, context) {
  if(!obj){
    return obj;
  }
  context = (context || obj);
  if(Array.prototype.forEach && obj.forEach){
    obj.forEach(callback)
  } else if (obj instanceof Array) {
    for (var i = 0; i < obj.length; i += 1) {
      if (obj[i] && callback.call(context, obj[i], i, obj)) {
        break;
      }
    }
  } else {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key && callback.call(context, obj[key], key, obj)) {
          break;
        }
      }
    }
  }
  return obj;
};

// Run through each item in an array, then resolve a Wait
// once all items have been iterated through.
//
// example:
//
//    eachWait(object, function(item, next, error) {
//      // do something with 'item', then do the next thing
//      next();
//    })
//    .done(function () {
//      console.log("Last item ran!")
//    }, function (reason) {
//      // Handle errors here.
//    });
//
var eachWait = function (obj, callback, context) {
  var len = size(obj);
  var current = 0;
  var wait = new Wait();
  context = context || obj;
  var next = function () {
    current += 1;
    // We're at the last item, so resolve the wait.
    if (current === len) wait.resolve();
  };
  var error = function (reason) {
    wait.reject(reason);
  };
  // Run an 'each' loop
  each(obj, function (item) {
    callback.call(context, item, next, error);
  });
  return wait;
};

// Extend an object
var extend = function(obj /*...*/){
  each(Array.prototype.slice.call(arguments, 1), function(source){
    if(source){
      for(var prop in source){
        if (source.hasOwnProperty(prop)) obj[prop] = source[prop];
      }
    }
  });
  return obj;
};

// A simple shim for Function.bind
var bind = function (func, ctx) {
  if (Function.prototype.bind && func.bind) return func.bind(ctx);
  return function () { func.apply(ctx, arguments); };
};