// Path
// ====
// Simple path helpers. Based in the node.js source-code.
var path = {};

// Resolves . and .. elements in a path array. There must
// be no slashes, empty elements or device names (c:\) in the array.
// This includes leading and trailing slashes.
var _normalizeArray = function (parts, allowAboveRoot) {
  // If the path goes above the root, `up` is > 0
  var up = 0;
  // Iterate through the array, moving up relative paths as needed.
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }
  // If the path is allowed to go above the root, restore
  // the leading `..`
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }
  return parts;
};

// Resolve a relative path
path.resolve = function (/* ..args */) {
  var resolvedPath = '';
  var resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var pathname = (i>=0) ? arguments[i] : '';
    // Skip empty or invalid entries.
    if (!pathname) continue;
    resolvedPath = pathname + '/' + resolvedPath;
    resolvedAbsolute = pathname.charAt(0) === '/';
  }
  // Normalize the path.
  resolvedPath = _normalizeArray(resolvedPath.split('/').filter(function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');
  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// Normalize a path.
path.normalize = function (pathname) {
  var isAbsolute = path.isAbsolute(pathname);
  var trailingSlash = pathname[pathname.length - 1] === '/';
  var segments = pathname.split('/');
  var nonEmptySegments = [];
  for (var i = 0; i < segments.length; i++) {
    if (segments[i]) {
      nonEmptySegments.push(segments[i]);
    }
  }
  pathname = _normalizeArray(nonEmptySegments, !isAbsolute).join('/');
  if (!pathname && !isAbsolute) pathname = '.';
  if (pathname && trailingSlash) pathname += '/';
  return (isAbsolute ? '/' : '') + pathname;
};

// Check if this is an absolute path.
path.isAbsolute = function (pathname) {
  return pathname.charAt(0) === '/';
};

// Get the directory of the current path.
path.dirname = function(pathname) {
  var dir = pathname.substring(0, Math.max(pathname.lastIndexOf('/')));
  if (!dir) return '.';
  return dir;
};
