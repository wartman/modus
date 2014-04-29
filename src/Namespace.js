
// --------------------
// Modus.Namespace
//
// Namespaces are to modules as modules are to exports in Modus.
// Use Namespaces to group related modules together.

var Namespace = Modus.Namespace = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._modules = [];
  this._imports = [];
};

Namespace.prototype.options = {
  namespaceName: 'root'
};

// Define a module in this namespace.
//
// example:
//    Modus.namespace('foo').module('bar', function (bar) {
//      // For convinience, you can import other modules in
//      // the same namespace like this:
//      bar.imports('.bin'); // imports from 'foo.bin'
//      // Import from other namespaces with a full path.
//      bar.imports('Baz').from('bar.baz');
//      bar.body(function () {
//        // code
//      });
//    });
Namespace.prototype.module = function (name, factory) {
  var module = new Modus.Module({
    namespace: this.getName(),
    moduleName: name
  });
  if (reservedName(name)) {
    throw new Error ('Cannot create a module with'
      + ' a reserved name: ' + name);
    return;
  }
  this._modules.push(module);
  createObjectByName('Modus.env.' + this.getName() 
    + '.' + name, module);
  if (factory) { 
    factory(module);
    module.run();
  }
  return module;
};

// Import a module to use in all this Namespace's modules.
Namespace.prototype.imports = function (deps) {
  this.is.pending(true);
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

// Run the namespace, depending on its state.
Namespace.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._enableModules();
  } else if (this.is.ready() || this.is.enabled()) {
    this.wait.resolve();
  } else if (this.is.failed()) {
    this.wait.reject();
  }
};

// Disable the namespace.
Namespace.prototype.disable = function (reason) {
  this.is.failed(true);
  this.wait.reject(reason);
}

// Get the namespace's name.
Namespace.prototype.getName = function () {
  return this.options.namespaceName;
};

// Same as above: needed in some functions.
Namespace.prototype.getFullName = function () {
  return this.options.namespaceName;
};

// To be used by Modus' compiler.
Namespace.prototype.compile = function () {
  // do compile code.
};

// Collect all imports (uses Module's method)
Namespace.prototype._loadImports = function () {
  Modus.Module.prototype._loadImports.call(this);
};

// Enable all modules.
Namespace.prototype._enableModules = function () {
  var remaining = this._modules.length;
  var self = this;
  if (!remaining) return;
  this.is.working(true);
  each(this._modules, function (module) {
    module.run();
    module.wait.done(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.enabled(true);
        self.run();
      }
    }, function () {
      self.disable('A module failed');
    });
  });
};