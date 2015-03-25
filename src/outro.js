// Create default context.
root.modus = new Modus();

root.modus.VERSION = '@VERSION';

// Define the 'mod' shortcut.
var _lastModule = root.mod;
root.mod = bind(root.modus.createModule, root.modus);
root.mod.noConflict = function () {
  var mod = root.mod;
  root.mod = _lastMod;
  return mod;
};

})(this);