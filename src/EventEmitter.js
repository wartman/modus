
// Modus.EventEmitter
// ------------------
// A simple event emitter, used internally for hooks.

var EventEmitter = Modus.EventEmitter = function () {
  this._listeners = {};
};

EventEmitter.prototype.addEventListener = function (name, callback, once) {
  if (typeof callback !== 'function')
    throw new TypeError('Listener must be a function: ' + typeof callback);
  if (!this._listeners[name]) this._listeners[name] = [];
  this._listeners[name].push({
    once: once,
    cb: callback
  }); 
  return this;
};

EventEmitter.prototype.emit = function (name) {
  var evs = this._listeners[name];
  var self = this;
  var args = Array.prototype.slice.call(arguments, 1);
  if (!evs) return this;
  each(evs, function(ev, index) {
    ev.cb.apply(self, args);
  });
  var filtered = filter(evs, function(ev) {
    return (ev.once === false);
  });
  if (filtered.length <= 0) 
    this.removeEventListener(name);
  else
    this._listeners[name] = filtered;
  return this;
};

EventEmitter.prototype.on = function (name, callback) {
  return this.addEventListener(name, callback, false);
};

EventEmitter.prototype.once = function (name, callback) {
  return this.addEventListener(name, callback, true);
};

EventEmitter.prototype.removeEventListener = function (name) {
  if (name) {
    delete this._listeners[name];
    return this;
  }
  for (var e in this._listeners) delete this._listeners[e];
  return this;
};

// Set up global event handler
Modus.events = new EventEmitter();