// Modus.Loader
// ============

var Loader = Modus.Loader = {};

// Regexp for parsing
var _module = /module\s+?([\s\S]+?)[;|\n\r]/g;
var _import = /import\s+?([\s\S]+?)[;|\n\r]/g;
var _as = /\s+?as\s+?([\s\S]+?)$/g;
var _using = /using\s+?([\s\S]+?)$/g;
var _exportVar = /export\s+?var\s+?([\s\S]+?)\s+?[\S]/g;
var _exportList = /export\s+?{([\s\S]+?)};?/g;

// Parse a Modus module into pure javascript.
Loader.parse = function (raw, name) {
  var module = new Modus.Module(name);

  // Find the module name.
  raw = raw.replace(_module, function (matches, modname) {
    module.defines(modname);
    name = modname;
    return '';
  });

  var namespace = name.split('.');
  namespace.pop();
  namespace = namespace.join('.');

  // Find imports
  raw = raw.replace(_import, function (matches, dep) {
    var alias = dep.split('.').pop(); // Get the last segment of the module name.
    var plugin = false
    if (dep.indexOf('.') === 0) {
      dep = namespace + dep;
    }
    dep = dep.replace(_as, function (matches, as) {
      alias = as;
      return '';
    });
    dep = dep.replace(_using, function (matches, using) {
      plugin = using;
      return '';
    });
    module.imports.push({id:dep});
    return "var " + alias + " = __import__('" + dep + "');\n";
  });

  // Find exports.
  raw = raw.replace(_exportVar, function (matches, exports) {
    return '__export__.' + exports.trim();
  });

  raw = raw.replace(_exportList, function (matches, list) {
    var items = list.split(',');
    var result = []
    each(items, function (item) {
      item = item.trim();
      result.push(item + ':' + item);
    });
    return '__export__({' + result.join(',') + '});\n';
  });

  // console.log(raw);

  module.factory = new Function('__import__, __export__', raw);

  return module;
};

// Holds visited urls to ensure they are only loaded once.
var _visited = {};

// Load the module via ajax.
Loader.load = function (module, next, error, options) {
  var src = getMappedPath(module, Modus.config('root'));
  var self = this;

  if(_visited.hasOwnProperty(src)){
    _visited[src].done(next, error);
    return;
  }

  var visit = _visited[src] = new Wait();
  visit.done(next, error);

  if(root.XMLHttpRequest){
    var request = new XMLHttpRequest();
  } else { // code for IE6, IE5
    var request = new ActiveXObject("Microsoft.XMLHTTP");
  }

  request.onreadystatechange = function(){
    if(4 === this.readyState){
      if(200 === this.status){
        try {
          var res = self.parse(this.responseText, module);
          visit.resolve(res);
        } catch (e) {
          visit.reject(e);
          console.log(e);
          throw new Error(e.message + ' in module [' + module + '] ');
        }
      } else {
        visit.reject(this.status);
      }
    }
  }

  request.open('GET', src, true);
  request.send();

  return visit;
};
