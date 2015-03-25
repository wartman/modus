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
