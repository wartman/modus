// Path
// ----
// Path processing. Based on the nodejs source code.
// This is probably too comprehensive for our needs, but
// look through it and see what will fit int with the API
// better then the current code.

var path = modus.path = {};

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

// Simple check to see if this is a path already.
path.isPath = function (pathname) {
  if (!pathname) return false;
  return (pathname.indexOf('/') >= 0 || pathname.indexOf('\\') >= 0);
};

// Convert to a URI from a modulePath, and ensure the resulting path
// is using posix-style slashes.
path.convertToPath = function (pathname) {
  // If this is a path already, return it, ensuring
  // that we're using posix slashes.
  if (!pathname) return '.';
  if(path.isPath(pathname)) {
    return pathname.replace(/\\/g, '/');
  }
  // Create our relative-module path
  var parts = pathname.split('.');
  var output = [];
  var up = 0;
  for (var i = 0; i <= parts.length; i++) {
    if (parts[i] == '') {
      if (up == 0) {
        output.push('.');
      } else {
        output.push('..');
      }
      up++;
    } else {
      output.push(parts[i]);
    }
  }
  return output.join('/');
};

path.convertToModuleName = function (pathname) {
  return pathname.replace(/\/|\\/g, '.');
};

// Resolve a relative path
path.resolve = function (from, to) {
  from = path.convertToPath(from);
  to = path.convertToPath(to);
  var resolvedPath = '';
  var resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    // var pathname = (i>=0) ? arguments[i] : modus.config('root');
    var pathname = (i>=0) ? arguments[i] : 'root';
    // Skip empty or invalid entries.
    if (!pathname) continue;
    resolvedPath = pathname + '/' + resolvedPath;
    resolvedAbsolute = pathname.charAt(0) === '/';
  }
  console.log(resolvedPath);
  // Normalize the path.
  resolvedPath = _normalizeArray(resolvedPath.split('/').filter(function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');
  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// Get a relative path. The inverse of path.resolve.
// @todo: may not be needed.
path.relative = function (from, to) {
  from = path.resolve(from);
  to = path.resolve(to);
  console.log(from, to);
  var trim = function (arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }
    var end = arr.length-1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }
    if (start>end) return [];
    return arr.slice(start, end + 1);
  };
  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));
  var length = Math.min(fromParts.length, toParts.length);
  var relativePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      relativePartsLength = i;
      break;
    }
  }
  var outputParts = [];
  for (var i = 0; i < relativePartsLength; i++) {
    outputParts.push('..');
  }
  outputParts = outputParts.concat(toParts.slice(relativePartsLength));
  return outputParts.join('/');
};

// Normalize a path.
path.normalize = function (pathname) {
  pathname = path.convertToPath(pathname);
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

// Join a path.
path.join = function () {
  var newpath = '';
  for (var i=0; i<arguments.length; i++) {
    var segment = path.convertToPath(arguments[i]);
    if (segment) {
      if (!newpath) {
        newpath += segment;
      } else {
        newpath += '/' + segment;
      }
    }
  }
  return path.normalize(newpath);
};

// Get the directory of the current path.
path.dirname = function(pathname) {
  pathname = path.convertToPath(pathname);
  var dir = pathname.substring(0, Math.max(pathname.lastIndexOf('/')));
  if (!dir) return '.';
  return dir;
};
