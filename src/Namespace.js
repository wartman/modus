// modus.Namespace
// ---------------
// Namespaces are simply objects that have access to an 'imports' 
// method which can be used to collect properties from other
// environments.
//
//    var ns = new modus.Namespace('foo.bar.bin');
//    ns.imports('bax', 'bin').from('.bix');
//    ns.imports('foo.bin.bar').as('bar');
//    ns.foo = 'foo';
//
var Namespace = modus.Namespace = function (moduleName) {
  this.moduleName = moduleName;
  // Ensure that this namespace is associated with a module.
  if (!modus.moduleExists(moduleName)) {
    var ensuredMod = modus.module(moduleName, false);
    ensuredMod.setNamespace(this);
  }
};

function _applyToNamespace (props, dep, env, many) {
  if (props instanceof Array) {
    each(props, function (prop) {
      _applyToNamespace(prop, dep, env, true);
    });
  } else if ('object' === typeof props) {
    each(props, function (alias, actual) {
      env[alias] = (dep.hasOwnProperty(actual))? dep[actual] : null;
    });
  } else {
    if (many) {
      // If 'many' is true, then we're iterating through props and
      // assigning them.
      env[props] = (dep.hasOwnProperty(props))? dep[props] : null;
    } else {
      if (dep.hasOwnProperty('default'))
        env[props] = dep['default']
      else
        env[props] = omit(dep, ['imports', 'moduleName']);
    }
  }
};

// Start an import chain. You can import specific properties from a module
// by using 'imports(<properties>).from(<moduleName>)'. For example:
//
//    var ns = new modus.Namespace('test');
//    // Pass an arbitrary number of arguments:
//    ns.imports('Foo', 'Bar').from('some.module');
//    // Or use an array:
//    ns.imports(['Foo', 'Bar']).from('some.module');
//    // Now all imported items are available in the current namespace:
//    console.log(ns.Foo, ns.Bar);
//
// If you want to import everything from a module (or import the 'default'
// export, if it is set) use 'imports(<moduleName>).as(<alias>)'. For example:
//
//    ns.imports('some.module').as('Module');
//    // The module is now available in the current namespace:
//    console.log(ns.Module.Foo, ns.Module.Bar);
//
// In both cases, '<moduleName>' will be parsed by modus and used to define
// a dependency for the current module. See 'Module#_investigate' for more on
// what's going on here.
Namespace.prototype.imports = function (/* args */) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  var props = [];
  if (args[0] instanceof Array) {
    props = args[0];
  } else {
    props = props.concat(args);
  }
  return {
    from: function (dep) {
      dep = normalizeModuleName(dep, self.moduleName);
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getNamespace(dep);
        _applyToNamespace(props, depEnv, self, false);
      }
    },
    as: function (alias) {
      var dep = props[0];
      dep = normalizeModuleName(dep, self.moduleName);
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getNamespace(dep);
        _applyToNamespace(alias, depEnv, self, false);
      }
    }
  };
};
