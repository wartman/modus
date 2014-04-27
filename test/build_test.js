'use strict';

var grunt = require('grunt');
var Build = require('../src/build');

exports.build_test = {
  
  setUp: function(done) {
    this.build = new Build();
    this.build
      .start(__dirname + '/fixtures/main.js', __dirname + '/tmp/app.js')
      .done(done);
  },

  test_compile: function (test) {
    // NOTE
    // Fails on windows due to use of /r/n vs /n, so we strip em all out.
    // May be a more elegent way to do this.
    var actual = grunt.file.read(__dirname + "/tmp/app.js");
    var expected = grunt.file.read(__dirname + "/fixtures/expected/app.js");

    test.equal(actual.replace(/\r|\n/g, ''), expected.replace(/\r|\n/g, ''), 'Module compiled as expected');
    test.done();
  },

  test_stress: function (test) {
    var actual = grunt.file.read(__dirname + "/tmp/app.js");
    var global = {};
    var module = Function('', actual);

    module.call(global);

    var stress = global.fixtures.stress;

    test.equal(stress.one.One, 'one');
    test.equal(stress.one.Foo, 'Foo');
    test.equal(stress.two.Two, 'two');
    test.equal(stress.three.Three, 'three');
    test.equal(global.shim, 'shimmed', 'Loaded shim');
    test.equal(global.fixtures.file.txt, 'loaded');

    test.done();
  },
};

exports.build_test_opt = {

  setUp: function (done) {
    var build = new Build({
      optimize: true
    });
    build
      .start(__dirname + '/fixtures/main.js', __dirname + '/tmp/app.min.js')
      .done(done);
  },

  test_compile_min: function (test) {
    var actual = grunt.file.read(__dirname + "/tmp/app.min.js");
    var expected = grunt.file.read(__dirname + "/fixtures/expected/app.min.js");

    test.equal(actual.replace(/\r|\n/g, ''), expected.replace(/\r|\n/g, ''), 'Module compiled as expected');
    test.done();
  },

  test_stress_min: function (test) {
    var actual = grunt.file.read(__dirname + "/tmp/app.min.js");
    var global = {};
    var module = Function('', actual);

    module.call(global);

    var stress = global.fixtures.stress;

    test.equal(stress.one.One, 'one');
    test.equal(stress.one.Foo, 'Foo');
    test.equal(stress.two.Two, 'two');
    test.equal(stress.three.Three, 'three');
    test.equal(global.fixtures.file.txt, 'loaded');

    test.done();
  }

};