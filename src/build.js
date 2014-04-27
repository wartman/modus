/**
 * zjs builder
 *
 * Copyright 2014
 * Released under the MIT license
 */

var modusFactory = require('./modus');
var sorter   = require('./sorter');
var fs       = require('fs');
var UglifyJS = require("uglify-js");
var _        = require('lodash');

/**
 * The zjs builder.
 */
var Build = function (options) {

  if ( !(this instanceof Build) ){
    return new Build(options);
  }

  var self = this;

  this.setup(options);

  this._shimmed = {};

  // Mock a global env for modus.
  this._global = {};
  this._global.MODUS_MODULE_LOADER = this.loader.bind(this);
  this._global.MODUS_FILE_LOADER = this.fileLoader.bind(this);

  // Bind a copy of z to the mocked up env.
  modusFactory(this._global);
  this._modus = this._global.modus;

  this._modus.plugin('txt', function (module, next, error) {
    self._global.MODUS_FILE_LOADER(module, 'txt', function (file) {
      var fileWrapper = self._modus(module);
      fileWrapper.exports(Function('', '  return \'' + file + '\''));
      fileWrapper.done(next, error);
    }, error);
  })

  this._exists = {};
  this._progressLog = '';
  this._compiled = '';
  this._header = '';
  this._onDone = function(){};
}

/**
 * Setup Build.
 *
 * @param {Object} options
 */
Build.prototype.setup = function(options){
  this.options = _.defaults(this.options, options);
}

/**
 * Default options.
 */
Build.prototype.options = {
  dest: false,
  main: 'main'
};

/**
 * Compile the project and output.
 */
Build.prototype.render = function () {
  var modules = this._modus.env.modules
    , moduleList = {}
    , sortedModules = []
    , compiled = ''
    , self = this;

  compiled += "/* namespaces */\n";
  _.each(this._modus.env.namespaces, function(val, ns){
    compiled += self.renderNamespace(ns);
  });

  compiled += "\n/* modules */\n";

  // Add shimmed modules.
  _.each(this._shimmed, function (module, name) {
    compiled += module + '\n';
  });

  // Ensure that modules dependent on other modules are always defined
  // lower down in the compiled script.
  for (item in modules) {
    if(item.indexOf('@') >= 0) continue; // Don't add shims.
    moduleList[item] = modules[item]._dependencies;
  }

  // Sort the modules with the topological sorter.
  sortedModules = sorter(moduleList, this.options.main);

  // Compile
  _.each(sortedModules, function(ns){
    if(ns.indexOf('@') >= 0) return; // Don't add shims.
    compiled += self.renderModule( modules[ns]._factory, ns );
  });

  compiled = "(function () {\n" + compiled + "\n}).call(this);"

  if(this.options.optimize){
    compiled = UglifyJS.minify(compiled, {fromString: true}).code;
    // Add license headers.
    compiled = this._header + compiled;
  }

  if(this.options.dest){
    fs.writeFileSync(this.options.dest, compiled);
  }

  this._compiled = compiled;
  return compiled;
}

/**
 * Render a module.
 *
 * @param {Function} factory
 * @param {String} namespace
 */
Build.prototype.renderModule = function (factory, namespace) {
  if (this._modus.env.shim[namespace]) {
    this.logProgress(true);
    return '';
  }
  this.logProgress(true);
  return namespace + ' = (' + factory + ')();\n';
}

/**
 * Render a namespace, ensuring all namespaces are defined.
 *
 * @param {String} namespace
 */
Build.prototype.renderNamespace = function (namespace) {
  var cur = ''
    , render = ''
    , parts = namespace.split('.')
    , exists = this._exists[parts[0]];

  if (!exists) {
    render += "var " + parts[0] + ' = this.' + parts[0] + ' = {};\n';
    exists = this._exists[parts[0]] = {};
  }

  cur = parts.shift();

  for (var part; parts.length && (part = parts.shift()); ) {
    cur = cur + '.' + part;
    if (exists[part]) {
      exists = exists[part];
    } else {
      exists = exists[part] = {};
      render += cur + ' = {};\n';
    }
  }

  return render;
}

/**
 * Try to extract license info from included modules.
 */
var licenseMatch = /\/\*\![\s\S]+?\*\//g;
Build.prototype.extractLicenses = function (file) {
  var matches = licenseMatch.exec(file);
  if (!matches) return;
  this._header += matches[0] + '\n\n';
}

/**
 * Log the current state of the builder.
 *
 * @param {Boolean} good Set to true to log a good state.
 */
Build.prototype.logProgress = function (good){
  this._progressLog += (good)? '.' : 'x';
  var stream = process.stdout
    , str = this._progressLog;
  process.nextTick(function () {
    stream.clearLine();
    stream.cursorTo(0);
    stream.write(str);
  });
}

/**
 * Loader that replaces the default.
 */
Build.prototype.loader = function (module, next, error) {

  var src = ( this._modus.getMappedPath(module) 
    || module.replace(/\./g, '/') + '.js' );
  
  src = process.cwd() + '/' + this._modus.env.root + src;

  var file = fs.readFileSync(src, 'utf-8');

  // Extract liscense info in case we're optimizing and want to add it back.
  this.extractLicenses(file);

  if (this._modus.env.shim[module]) {
    this._shimmed[module] = file;
    this._modus(module).exports(function(){}).done(next);
    return;
  }

  try {
    var modusModule = Function('modus', file);
    modusModule(this._modus);
  } catch (e) {
    this.logProgress(false);
  }

  if (this._modus.getObjectByName(module)) {
    this._modus.env.modules[module].done(next, error);
  }
}

Build.prototype.fileLoader = function (module, type, next, error) {
  if (arguments.length < 4) {
    error = next;
    next = type;
    type = 'txt'; 
  }
  var src = ( this._modus.getMappedPath(module)
    || module.replace(/\./g, '/') + '.' + type );
  src = process.cwd() + '/' + this._modus.env.root + src;
  var file = fs.readFileSync(src, 'utf-8');
  next(file);
}

/**
 * Start compiling the project.
 *
 * @param {String} src
 * @param {String} dest
 */
Build.prototype.start = function (src, dest) {

  var file = fs.readFileSync(src, 'utf-8')
    , self = this;

  this.options.dest = (dest || false);

  if (this.options.buildfile) {
    var buildz = JSON.parse(fs.readFileSync(src), 'utf-8');
    src = buildmodus.src + '.js';
    dest = buildmodus.dest;
    this.setup(buildmodus.options);
  }

  if (!dest) dest = this.options.dest || false;
  if (!dest) {
    throw Error ('No destination file specified.');
    return;
  }

  var modusModule = Function('modus', file);
  modusModule(this._modus);

  this.options.main = (this._modus.config('main') || this.options.main);

  this._modus.env.modules[this.options.main].done( function renderModule () {
    self.render();
    console.log(self._progressLog);
    self._onDone();
  });

  return this;
}

/**
 * Run when compiling is done.
 */
Build.prototype.done = function (next) {
  var self = this;
  this._onDone = function(){
    next.apply(self, arguments);
  }

  return this;
}

module.exports = Build;