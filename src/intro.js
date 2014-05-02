//!
// Modus @VERSION
//
// Copyright 2014
// Released under the MIT license
//
// Date: @DATE

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

"use strict"

// The main modus namespace
var Modus = root.Modus = {};

// Save the current version.
Modus.VERSION = '@VERSION';