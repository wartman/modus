// ScriptLoader
// ============
// Loads modules using the `<scripts>` tag.
var ScriptLoader = function () {
  this._visited = {}; 
};

// Get a visit if one exists
ScriptLoader.prototype.getVisit = function(pathName) {
  return this._visited[pathName];
};

// Add a visit
ScriptLoader.prototype.addVisit = function(pathName, cb) {
  this._visited[pathName] = true;
  return this;
};

ScriptLoader.prototype.createScriptTag = function (scriptPath) {
  var script = document.createElement("script");
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.setAttribute('data-module', scriptPath);
  script.src = scriptPath + '.js';
  return script;
};

ScriptLoader.prototype.insertScript = function (script, next) {
  var head = document.getElementsByTagName("head")[0] || document.documentElement;
  var done = false;
  script.onload = script.onreadystatechange = function () {
    console.log('onLoad triggered');
    if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
      done = true;
      // First arg === error, second should be this script's `src`
      next(null, script.src);
      // Handle memory leak in IE
      script.onload = script.onreadystatechange = null;
    }
  };
  head.insertBefore(script, head.firstChild).parentNode;
};

ScriptLoader.prototype.load = function(pathName, next) {
  var _this = this;
  if (this.getVisit(pathName)) {
    next(null, pathName);
    return this;
  }
  this.addVisit(pathName);
  var script = this.createScriptTag(pathName);
  this.insertScript(script, next);
  return this;
};
