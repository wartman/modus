// Helpers
// -------

// ONLY USED IN ONE PLACE
    // Get all keys from an object
    var keys = function(obj) {
      if ("object" !== typeof obj) return [];
      if (Object.keys) return Object.keys(obj);
      var keys = [];
      for (var key in obj) if (obj.hasOwnProperty(key)) keys.push(key);
      return keys;
    };

// ONLY USED RARELY
    // Get the size of an object
    var size = function (obj) {
      if (obj == null) return 0;
      return (obj.length === +obj.length) ? obj.length : keys(obj).length;
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

// Shim for Array.prototype.indexOf
var nativeIndexOf = Array.prototype.indexOf;
var inArray = function(arr, check) {
  // Prefer native indexOf, if available.
  if (nativeIndexOf && arr.indexOf === nativeIndexOf)
    return arr.indexOf(check);
  var index = -1;
  each(arr, function (key, i) {
    if (key === check) index = i;
  });
  return index;
};

// Filter shim.
var nativeFilter = Array.prototype.filter;
var filter = function (obj, predicate, context) {
  var results = [];
  if (obj == null) return results;
  if (nativeFilter && obj.filter === nativeFilter)
    return obj.filter(predicate, context);
  each(obj, function(value, index, list) {
    if (predicate.call(context, value, index, list)) results.push(value);
  });
  return results;
};

// Return an object, minus any blacklisted items.
var omit = function(obj, blacklist) {
  var copy = {}
  for (var key in obj) {
    if (obj.hasOwnProperty(key) && (inArray(blacklist, key) < 0))
      copy[key] = obj[key];
  }
  return copy;
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
    root.addEventListener('message', onMessage, true);
    return function (fn, ctx) { enqueueFn(fn, ctx) && root.postMessage(msg, '*'); };
  }
})();

// A super stripped down promise-like thing. This is most definitely
// NOT promises/A+ compliant, but its enough for our needs.
var when = function (resolver) {
  var context = this;
  var _state = false;
  var _readyFns = [];
  var _failedFns = [];
  var _value = null;
  var _dispatch = function (fns, value, ctx) {
    if (!fns.length) return;
    _value = (value || _value);
    ctx = (ctx || this);
    var fn;
    while (fn = fns.pop()) { fn.call(ctx, _value); }
  };
  var _resolve = function (value, ctx) {
    context = ctx || context;
    _state = 1;
    _dispatch(_readyFns, value, ctx)
  };
  var _reject = function (value, ctx) {
    context = ctx || context;
    _state = -1;
    _dispatch(_failedFns, value, ctx)
  };

  // Run the resolver
  if (resolver)
    resolver(_resolve, _reject);

  return {
    then: function (onReady, onFailed) {
      nextTick(function () {
        if(onReady && ( "function" === typeof onReady)){
          (_state === 1)
            ? onReady.call(context, _value)
            : _readyFns.push(onReady);
        }
        if(onFailed && ( "function" === typeof onFailed)){
          (_state === -1)
            ? onFailed.call(context, _value)
            : _failedFns.push(onFailed);
        }
      });
      return this;
    },
    fail: function (onFailed) {
      return this.then(null, onFailed);
    },
    resolve: _resolve,
    reject: _reject
  };
};

// Run a callback on an array of items, then resolve
// the promise when complete.
var whenAll = function (obj, cb, ctx) {
  ctx = ctx || this;
  var remaining = size(obj);
  return when(function (res, rej) {
    each(obj, function (arg) {
      when(function (res, rej) {
        cb.call(ctx, arg, res, rej)
      }).then(function () {
        remaining -= 1;
        if (remaining <= 0) res(null, ctx);
      }).fail(function (reason) {
        rej(reason);
      });
    });
  });
};

// Check if this is a path or an object name
var isPath = function (obj) {
  return obj.indexOf('/') >= 0;
};

// Excape characters for regular expressions.
var escapeRegExp = function (str) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
