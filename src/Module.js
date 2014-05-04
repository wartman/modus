
// --------------------
// Modus.Module
//
// The core of Modus.

var Module = Modus.Module = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this.env = {};
  this.modules = {};
  this._body = false;
  this._imports = [];
  this._exports = [];
};

Module.prototype.options = {
  namespace: 'root',
  moduleName: null,
  throwErrors: true
};

// Define a sub-namespace
//
// example: 
//    (to do)
Module.prototype.namespace = function (name, factory) {
  var namespace = this.module(name, factory, {namespace: true});
  return namespace;
};

// Define a sub-module
//
// example: 
//    (to do)
Module.prototype.module = function (name, factory, options) {
  if (name.indexOf('.') >= 0) {
    throw new Error('Cannot create a sub-namespace from a module: ' + name);
  }
  options = (options || {});
  var self = this;
  var namespace = (options.namespace)
    ? this.getFullName() + '.' + name 
    : this.getFullName();
  var moduleName = (options.namespace)
    ? null
    : name;
  var module = new Modus.Module({
    namespace: namespace,
    moduleName: moduleName
  });
  createObjectByName(name, module, this.modules);
  if (factory) factory(module);
  nextTick(function () {
    self.is.pending(true);
    self.run();
  });
  return module;
};

// Import a dependency into this module.
//
// example:
//    module.import('foo.bar').as('bar');
//    module.import(['foo', 'bin']).from('foo.baz');
//
// Imported dependencies will be available as properties
// in the current module.
//
// example:
//    module.import(['foo', 'bin']).from('foo.baz');
//    module.body(function () {
//      module.foo(); // from foo.baz.foo
//      module.bin(); // frim foo.baz.bin
//    });
Module.prototype.imports = function (deps) {
  this.is.pending(true);
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

// Export a component to this module using [factory].
//
// You should wrap all code that uses imported
// dependencies in an export method. 
//
// example:
//    module.exports('foo', function (module) {
//      var thing = module.importedThing();
//      // Set an export by returning a value
//      return thing;
//    });
//    module.exports('fid', function (module) {
//      // Set a value using CommonJS like syntax.
//      module.exports.foo = "foo";
//      module.exports.bar = 'bar';
//    });
//
// You can also export several components in one go
// by skipping [name] and returning an object from [factory]
//
// example:
//    module.exports(function (module) {
//      return {
//        foo: 'foo',
//        bar: 'bar'
//      };
//    });
Module.prototype.exports = function (name, factory) {
  if (!this.options.moduleName) {
    throw new Error('Cannot export from a namespace: ', this.getFullName());
    return;
  }
  if (!factory) {
    factory = name;
    name = false;
  }
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

// Register a function to run after all imports and exports
// are complete. Unlike `Module#exports`, the value returned
// from the callback will NOT be applied to the module. Instead,
// you can define things diretly, by adding a property
// to the passed variable, or by using the special 'exports'
// property, which works similarly to Node's module system.
//
// Can only be called once per module.
//
// example:
//    foo.imports('foo.bar').as('importedFoo');
//    foo.exports('bin', 'bin');
//    foo.body(function (foo) {
//      foo.bin; // === 'bin'
//      foo.bar = 'bar'; // Set items directly.
//      // Use exports to set the root of this module.
//      // This WILL NOT overwrite previously exported properties.
//      foo.exports = function() { return 'foo'; };
//    });
Module.prototype.body = function (factory) {
  if (!this.options.moduleName) {
    throw new Error('Cannot export from a namespace: ', this.getFullName());
    return;
  }
  if (this._body) {
    this._disable('Cannot define [body] more then once: ', this.getFullName());
    return;
  }
  this._body = new Modus.Export(factory, this, {isBody: true});
  return this;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.moduleName) return this.options.namespace;
  return this.options.namespace + '.' + this.options.moduleName;
};

// Run the module. The action taken will differ depending
// on the current state of the module.
Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enable();
  } else if (this.is.ready() || this.is.enabled()) {
    this.is.enabled(true);
    this.wait.resolve(this);
  } else if (this.is.failed()) {
    this.wait.reject();
  }
  return this;
};

// Disable the module. A disabled module CANNOT be re-enabled.
Module.prototype._disable = function (reason) {
  var self = this;
  this.is.failed(true);
  this.wait.done(null, function (e) {
    if (self.options.throwErrors && e instanceof Error) {
      throw e
    }
  });
  this.wait.reject(reason);
};

// This will be used by the Modus compiler down the road.
Module.prototype._compile = function () {
  // Run compile code here.
};

// Iterate through imports and run them all.
Module.prototype._loadImports = function () {
  var self = this;
  this.is.working(true);
  if (!this._imports.length) {
    this.is.loaded(true);
    this._enable();
    return;
  }
  eachThen(this._imports, function (item, next, error) {
    if (item.is.loaded()) return next();
    item.load(next, error);
  }, function () {
    self.is.loaded(true);
    self._enable();
  }, function (reason) {
    self._disable(reason);
  });
};

Module.prototype._enable = function () {
  var self = this;
  this.is.working(true);
  this._enableModules(function () {
    self._enableExports(function () {
      self.is.enabled(true);
      self.run();
    });
  });
};

// Iterate through exports and run them.
Module.prototype._enableExports = function (next) {
  if (!this._exports.length) {
    if (this._body) this._body.run();
    return next();
  }
  var self = this;
  eachThen(this._exports, function (item, next, error) {
    if (item.is.enabled()) return next();
    try {
      item.run();
      next();
    } catch(e) {
      error(e);
    }
  }, function () {
    if (self._body) self._body.run();
    next();
  }, function (e) {
    self._disable(e);
  });
};

// Enable all modules.
Module.prototype._enableModules = function (next) {
  if (!size(this.modules)) return next();
  var self = this;
  eachThen(keys(this.modules), function (key, next, error) {
    var module = self.modules[key];
    module.run();
    module.wait.done(next, function () {
      error(key);
    });
  }, next, function (id) {
    self._disable('The module [' + id + '] failed for: ' + self.getFullName());
  });
};
