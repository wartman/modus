var _ = require('lodash');
var modus = require('../');

// Unglobalize the default modus exports.
var _modusExports = {
  module: {
    find: 'module(',
    ifNot: 'modus.module',
    replace: 'modus.module('
  },
  define: {
    find: 'define(',
    ifNot: 'modus.define',
    replace: 'modus.define('
  }
};

var anonMod = /modus\.module\(\s?function/g;
var anonAmd = /modus\.define\(\s?function/g;

// Make sure modules are not anon.
exports.normalizeDefinition = function (raw, name) {
  _.each(_modusExports, function (item) {
    if (!raw.match(item.ifNot))
      raw = raw.replace(item.find, item.replace)
  });

  if (name) {
    name = modus.normalizeModuleName(name);
    raw = raw.replace(anonMod, 'modus.module(\'' + name + '\', function');
    raw = raw.replace(anonAmd, 'modus.define(\'' + name + '\', function');
  }

  return raw;
};


// If this has config info, try to parse it.
var _getConfig = /modus\.config\(([\s\S\r\n'"\{\}]+?)\)/g
// Config might be defined by modus.main too.
var _getMainConfig = /modus\.main\(([\s\S\r\n'"\{\}]+),\s?function/g;

// Get configuration
exports.getConfig = function (raw, build) {
  raw = raw.replace(_getConfig, function (match, cfg) {
    build.outputConfig(cfg);
    return "";
  }); 
  raw = raw.replace(_getMainConfig, function (match, cfg) {
    build.outputConfig(cfg);
    return "modus.main(function";
  });
  return raw;
};

// Simple error handling.
exports.baseError = function (err) {
  if (err instanceof Error) {
    throw err;
  } else {
    throw new Error(err);
  }
};