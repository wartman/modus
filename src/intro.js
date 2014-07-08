/*!
 * Modus @VERSION
 *
 * Copyright 2014
 * Released under the MIT license
 *
 * Date: @DATE
 */

(function (factory) {

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    var root = {};
    factory(root);
    module.exports = root.Modus;
  } else if (typeof window !== "undefined") {
    factory(window);
  }

}(function (root, undefined) {
// We need to use Function, sorry jsLint.
/*jslint evil: true */