
// --------------------
// Modus.Module
//
// The core of Modus.

var Module = Modus.Module = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  // Create the actual module.
  createObjectByName(this.getFullName(), { exports: {} }, Modus.env);
  this.env = getObjectByName(this.getFullName(), Modus.env);
  // Internal vars
  this._body = false;
  this._imports = [];
  this._exports = [];
};

Module.prototype.options = {
  namespace: 'root',
  moduleName: null,
  throwErrors: true
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
  if (!factory) {
    factory = name;
    name = false;
  }
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

// Synatic sugar for wrapping code that needs to be run
// after the module has collected all its imports, but 
// either doesn't export anything, or defines several of the
// module's exports. Will always be run last, after any 
// export calls.
//
// Can only be called once per module.
//
// example:
//    module.imports('foo.bar').as('importedFoo');
//    module.body(function (module) {
//      module.importedFoo();
//    });
//    // or:
//    module.body(function (module) {
//      module.exports = {
//        foo: module.importedFoo,
//        bar: 'bar'
//      };
//    });
Module.prototype.body = function (factory) {
  if (this._body) {
    this._disable('Cannot define [body] more then once: ', this.getFullName());
    return;
  }
  this._body = new Modus.Export(factory, this);
  return this;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  return this.options.namespace + '.' + this.options.moduleName;
};

// Run the module. The action taken will differ depending
// on the current state of the module.
Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enableExports();
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
    if (self.options.throwErrors) throw e;
  });
  this.wait.reject(reason);
};

// This will be used by the Modus compiler down the road.
Module.prototype._compile = function () {
  // Run compile code here.
};

// Iterate through imports and run them all.
Module.prototype._loadImports = function () {
  var remaining = this._imports.length;
  var self = this;
  this.is.working(true);
  if (!remaining) {
    this.is.loaded(true);
    this.run();
    return;
  }
  each(this._imports, function (item) {
    item.load(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.loaded(true);
        self.run();
      }
    }, function (reason) {
      self._disable(reason);
    });
  });
};

// Iterate through exports and run them.
Module.prototype._enableExports = function () {
  var self = this;
  this.is.working(true);
  each(this._exports, function (item) {
    if (item.is.enabled()) return;
    try {
      item.run();
    } catch(e) {
      self._disable(e);
    }
  });
  if (!this.is.working()) return;
  if (this._body)  this._body.run();
  this.is.enabled(true);
  this.run();
};
