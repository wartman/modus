
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
  this._value = false;
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
  // Run export
  if ('function' === typeof this._definition) {
    this._value = this._definition(this._module.env);
  } else {
    this._value = this._definition;
  }
  // Check for exports.
  if (size(this._module.env.exports) > 0) {
    if (this._module.env.exports.hasOwnProperty('exports')) {
      throw new Error('Cannot export a component nammed \'exports\' for module: ' + this._module.getFullName());
    }
    this._value = this._module.env.exports;
    this._module.env.exports = {};
  }
  // Apply to module
  if (this._name) {
    createObjectByName(this._name, this._value, this._module.env);
  } else {
    each(this._value, function (value, key) {
      createObjectByName(key, value, self._module.env);
    });
  }
  self.is.enabled(true);
};

Export.prototype.compile = function () {
  // Do compile code.
};