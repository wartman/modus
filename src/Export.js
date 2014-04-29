
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