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

// Apply defaults to an object.
var defaults = function (defaults, options){
  if (!options) return defaults;
  for (var key in defaults) {
    if (defaults.hasOwnProperty(key) && !options.hasOwnProperty(key)) {
      options[key] = defaults[key];
    }
  }
  return options;
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
