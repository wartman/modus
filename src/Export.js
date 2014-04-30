
// --------------------
// Modus.Export

// Handle an export for the parent module. [factory] passes 
// the current module's environment, letting you access previously
// imported and exported components for this module. You can
// define the module either by returning a value or by using
// a CommonJS-style '<module>.exports' syntax. If [factory] is
// not a funtion, it will define the current export directly.
//
// example:
//    foo.exports('foo', 'bar');
//    foo.exports('bar', function (foo) {
//      foo.bar; // === 'bar'
//      foo.exports = 'bin' // defines 'foo.bar'
//    });
//    foo.exports('baz', function (foo) {
//      foo.bar; // === 'bar'
//      foo.bar; // === 'bin'
//      return 'bin' // defines 'foo.baz'
//    });
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
  if (size(this._module.env.exports) > 0 || ("object" !== typeof this._module.env.exports) ) {
    if (this._module.env.exports.hasOwnProperty('exports')) {
      throw new Error('Cannot export a component nammed \'exports\' for module: ' + this._module.getFullName());
    }
    this._value = this._module.env.exports;
  }
  // Apply to module
  if (this._name) {
    this._module.env[this._name] = this._value;
  } else if ("object" === typeof this._value) {
    each(this._value, function (value, key) {
      self._module.env[key] = value;
    });
  } else if (this._value) {
    // Define the root module.
    this._module.env = this._value;
  }
  // Always clear out exports.
  this._module.env.exports = {};
  self.is.enabled(true);
};

Export.prototype.compile = function () {
  // Do compile code.
};