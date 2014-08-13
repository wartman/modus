// modus.Environment
// ---------------
// Environments are simply objects that have access to an 'imports' 
// method which can be used to collect properties from other
// environments.
//
//    var ns = new modus.Environment('foo.bar.bin');
//    ns.imports(['bax', 'bin']).from('.bix');
//    ns.imports('foo.bin.bar').as('bar');
//    ns.foo = 'foo';
//
var Environment = modus.Environment = function (name) {
  var nameInfo = modus.parseName(name);
  this.__name = nameInfo.fullName;
  this.__namespace = nameInfo.namespace;
  // Register with modus
  if (this.__name)
    modus.addEnv(this.__name, this);
};

function _applyToEnvironment (props, dep, env, many) {
  if (props instanceof Array) {
    each(props, function (prop) {
      _applyToEnvironment(prop, dep, env, true);
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
        env[props] = omit(dep, ['imports', '__name', '__namespace']);
    }
  }
};

Environment.prototype.imports = function (props) {
  var self = this;
  return {
    from: function (dep) {
      if (dep.indexOf('.') === 0)
        dep = modus.parseName(dep, self.__namespace).fullName;
      if (modus.envExists(dep)) {
        var depEnv = modus.getEnv(dep);
        _applyToEnvironment(props, depEnv, self, false);
      }
    },
    as: function (alias) {
      var dep = props;
      if (dep.indexOf('.') === 0)
        dep = modus.parseName(dep, self.__namespace).fullName;
      if (modus.envExists(dep)) {
        depEnv = modus.getEnv(dep);
        _applyToEnvironment(alias, depEnv, self, false);
      }
    }
  };
};
