
// Export the new context.
return modus;

};

// Create the default exports
var def = createContext();
if (!root.modus) {
  makeRoot('modus', def);
  // Export helper methods to the root.
  makeRoot('mod', def.module);
  makeRoot('module', def.module);
  makeRoot('define', def.define);
} else {
  makeRoot('modus' + uniqueId(), def);
}

// Allow the creation of new contexts.
def.newContext = createContext;

// If this script tag has 'data-main' attribute, we can
// autostart without the need to explicitly call 'modus.start'.
function _autostart() {
  var scripts = document.getElementsByTagName( 'script' );
  var script = scripts[ scripts.length - 1 ];
  if (script) {
    var main = script.getAttribute('data-main');
    if (main)
      def.start(main);
  }
};

if (typeof document !== 'undefined')
  _autostart();
