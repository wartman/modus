
// --------------------
// Modus.Export

var Export = Modus.Export = function (name, factory, module) {
  this._name = name;
  this._module = module;
  this._definition = factory;
  this._value = {};
};

Export.prototype.getFullName = function () {
  return  this._module.getFullName() + '.' + this._name;
};

// Run the export. Will apply it directly to the module object in Modus.env.
Export.prototype.run = function () {
  if ('function' === typeof this._definition) {
    this._value = this._definition();
  } else {
    this._value = this._definition;
  }
  createObjectByName('Modus.env.' + this.getFullName(), this._value);
};

Export.prototype.compile = function () {
  // Do compile code.
};