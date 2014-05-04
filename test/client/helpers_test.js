(function () {

  module('Modus Helpers Test');

  test('nextTick', 1, function (test) {
    stop();
    nextTick(function(){
      start();
      test.ok(true, 'Ran test');
    });
  });

  test('Wait', 2, function (test) {
    stop();
    var wait = new Wait();
    wait.done(function () {
      start();
      test.ok(true);
    });
    wait.resolve();
    stop();
    var wait = new Wait();
    wait.done(function () {
      start();
      ok(false);
    }, function () {
      start();
      ok(true, 'Triggered error');
    });
    wait.reject();
  });

  test('Is', function (test) {
    var is = new Is();
    is.pending(true);
    test.equal(is._state, STATES.PENDING);
    test.equal(is.pending(), true);
    is.loaded(true)
    test.equal(is._state, STATES.LOADED);
    // etc.
  });

  test('keys', function (test) {
    var obj = {
      one: 'one value',
      two: 'two value',
      three: 'three value'
    };
    test.deepEqual(keys(obj), ['one', 'two', 'three']);
  });

  test('defaults', function (test) {
    var def = {
      one: 'one value',
      three: 'three value'
    };
    test.deepEqual(defaults({two:'two value'}, def), {
      one: 'one value',
      two: 'two value',
      three: 'three value'
    }, 'defaults applied');
  });
  
  test('extend', function (test) {
    var base = {
      one: 'one value',
      two: 'two value',
      three: 'three value'
    };
    var extended = extend(base, {
      three: 'three extended value',
      four: 'four value'
    });
    test.deepEqual(extended, {
      one: 'one value',
      two: 'two value',
      three: 'three extended value',
      four: 'four value'
    }, 'extended');
  });

  test('size', function (test) {
    var obj = {
      one: 'one value',
      two: 'two value',
      three: 'three value'
    };
    test.equal(size(obj), 3, 'Got size');
  });

  test('eachThen', function (test) {
    stop();
    var result = '';
    eachThen([
      'one',
      'two',
      'three'
    ], function (item, next, error) {
      result += item;
      next();
    }, function () {
      start();
      test.equal(result, 'onetwothree');
    });
  });

  test('create/getObjectByName', function (test) {
    createObjectByName('helper.one', 'foo');
    test.equal(getObjectByName('helper.one'), helper.one, 'Created and got');
    var ctx = {};
    createObjectByName('helper.one', 'foo', ctx);
    test.equal(getObjectByName('helper.one', ctx), ctx.helper.one, 'Got from context');
  });

  test('isPath/getObjectByPath/getPathByObject', function (test) {
    test.equal(isPath('foo.bin'), false);
    test.equal(isPath('foo/bin.js'), true);
    test.equal(getObjectByPath('foo/bin.js'), 'foo.bin');
    test.equal(getPathByObject('foo.bin'), 'foo/bin');
  });

  test('getModulePath/getNamespacePath', function (test) {
    test.equal(getModulePath('foo.bar.bin'), 'foo.modules.bar.modules.bin');
    test.equal(getNamespacePath('foo.bar.bin'), 'foo.modules.bar');
    // Convert paths
    test.equal(getModulePath('foo/bar/bin.js'), 'foo.modules.bar.modules.bin');
    test.equal(getNamespacePath('foo/bar/bin.js'), 'foo.modules.bar');
  });

})();