var Export = Modus.Export = function (name, factory, module) {
  this._name = name;
  this._module = module;
  this._factory = factory;
};

Export.prototype.getFullName = function () {
  return  this._module.getFullName() + '.' + this._name;
};

// Run the export. Will apply it directly to the module object in Modus.env.
Export.prototype.run = function () {
  createObjectFromName('Modus.env.' + this.getFullName());
  var prop = getObjectByName('Modus.env.' + this.getFullName());
  this._factory(prop);
};

Export.prototype.compile = function () {
  // Do compile code.
};