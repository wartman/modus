(function(){

  module('modus');

  test('namespaces', function () {

    modus('main');
    ok(!modus.env.namespaces['main'], 'Top level namespaces are not registered.');

    modus('moduleTest.namespaces');
    ok(modus.env.namespaces['moduleTest'], 'Registers namespace, not component.');
    ok(!modus.env.namespaces['moduleTest.namespaces'], 'Registers namespace, not component.');

    modus('moduleTest.sub.namespaces');
    ok(modus.env.namespaces['moduleTest.sub'], 'Registers namespace, not component.');
    ok(!modus.env.namespaces['moduleTest.sub.namespaces'], 'Registers namespace, not component.');

  });

  test('Get a dep', function () {

    stop();

    modus('moduleTest.exports').
    imports('fixtures.exports').
    exports(function(){
      start();
      equal(fixtures.exports.Foo, 'Foo', 'Modules imported');
    });

  });

  test('Stress test', function(){

    stop();

    modus('moduleTest.stress').
    imports('fixtures.stress.one').
    imports('fixtures.stress.two').
    imports('fixtures.stress.three').
    exports(function(){
      start();
      var stress = fixtures.stress;
      equal(stress.one.One, 'one');
      equal(stress.one.Foo, 'Foo');
      equal(stress.two.Two, 'two');
      equal(stress.three.Three, 'three');
    });

  });

  test('Test mapping in namespaces', function () {

    modus.map('fixtures/map/mapped.js', [
      'foo.mapped'
    ]);

    equal(modus.getMappedPath('foo.mapped'), 'fixtures/map/mapped.js', 'Path was found');

    modus.map('fixtures/fake/module.js', [
      'foo.fake',
      'foo.fake.*',
      'foo.**.many',
      'foo.*.one'
    ]);

    equal(modus.getMappedPath('foo.fake'), 'fixtures/fake/module.js', 'Path was found');
    equal(modus.getMappedPath('foo.fake.Bar'), 'fixtures/fake/module.js', 'Path was found');
    equal(modus.getMappedPath('foo.fake.Baz'), 'fixtures/fake/module.js', 'Path was found');
    equal(modus.getMappedPath('foo.fake.Foo'), 'fixtures/fake/module.js', 'Path was found automatically');

    equal(modus.getMappedPath('foo.things.many'), 'fixtures/fake/module.js', '** matches many segments');
    equal(modus.getMappedPath('foo.things.etc.many'), 'fixtures/fake/module.js', '** matches many segments');
    notEqual(modus.getMappedPath('foo.things.etc.fud'), 'fixtures/fake/module.js', '** does not match when last segment is incorrect');

    equal(modus.getMappedPath('foo.things.one'), 'fixtures/fake/module.js', '* matches one segment');
    notEqual(modus.getMappedPath('foo.things.etc.one'), 'fixtures/fake/module.js', '* does not match many segments');

  });

  test('Test mapping in urls', function () {

    modus.map('fixtures/fake/*.js', [
      'fid.*'
    ]);
    equal(modus.getMappedPath('fid.bin'), 'fixtures/fake/bin.js', 'Mapped');
    notEqual(modus.getMappedPath('fid.bin.bar'), 'fixtures/fake/bin/bar.js', '* matches only one');

    modus.map('fixtures/fake/many/**/*.js', [
      'fid.**.*'
    ]);
    equal(modus.getMappedPath('fid.bin.bar'), 'fixtures/fake/many/bin/bar.js', '** matches many');
    equal(modus.getMappedPath('fid.bin.baz.bar'), 'fixtures/fake/many/bin/baz/bar.js', '** matches many');

  });

  test('Load mapped module', function () {

    modus.map('fixtures/map/mapped.js', 'foo.*');

    stop();

    modus('moduleTest.mapped').
    imports('foo.mapped').
    exports(function(){
      start();
      equal(foo.mapped, 'mapped', 'Module was mapped');
    });

  });

  test('shim', function(){

    modus.shim('shim', {
      map: 'fixtures/shim/no-deps.js',
      imports: false
    });

    stop();

    modus('moduleTest.shimmed').
    imports('shim').
    exports(function(){
      start();
      equal(shim, 'shimmed', 'Shimmed file loaded');
    });

    modus.shim('shimDeps', {
      map: 'fixtures/shim/deps.js',
      imports: [
        'fixtures.shim.dep'
      ]
    });

    stop();

    modus('moduleTest.shimmedDeps').
    imports('shimDeps').
    exports(function(){
      start();
      equal(shimDeps.test, 'shimmed', 'Shimmed file loaded');
      equal(shimDeps.dep, 'dep', 'Dependency loaded');
    });

  });

  test('Don\'t load modules if already defined', function () {

    modus('foo.bar').exports(function(){
      return {
        Bin: 'Loaded Once'
      };
    });

    stop();

    modus('moduleTest.loadOnce').
    imports('foo.bar').
    exports(function () {
      start();
      equal(foo.bar.Bin, 'Loaded Once', 'Didn\'t look for another module');
    });

  });

  test('alertnate API', function () {

    stop();

    modus('moduleTest.callbackApi', function (imports, exports) {

      imports('fixtures.exports');

      exports(function(){
        start();
        equal(fixtures.exports.Foo, 'Foo', 'Modules imported, alternate API works.');
      });

    });

  });

  test('Plugins', function () {
    
    stop();

    modus.plugin('test', function (module, next, error) {
      modus(module).exports(function(){ return "plugin"; }).done(next);
    });

    modus('moduleTest.plugin', function (imports, exports) {

      imports( 'test!plugin.test' );
      exports(function () {
        start();
        equal( plugin.test, 'plugin', 'Plugin ran.' );
      })

    });

  });

  test('Ajax plugins', function () {
    
    stop();

    modus('moduleTest.getTxt', function (imports, exports) {
      imports('txt!fixtures.file.txt');
      exports(function () {
        start();
        equal(fixtures.file.txt, 'loaded', 'File was loaded.');
      });
    });

  });

  test('Modules exports only once.', function () {

    var increment = 0;

    modus('moduleTest.increment', function () {
      increment += 1;
      return increment;
    });

    stop();
    modus('moduleTest.incrementOne', function (imports, exports) {
      imports('moduleTest.increment');
      exports(function () {
        start();
        equal(increment, 1);
      })
    });

    stop();
    modus('moduleTest.incrementTwo', function (imports, exports) {
      imports('moduleTest.increment');
      exports(function () {
        start();
        equal(increment, 1, 'Module did not export twice');
      })
    });

    stop();
    modus('moduleTest.incrementThree', function (imports, exports) {
      imports('moduleTest.increment');
      exports(function () {
        start();
        equal(increment, 1, 'Module did not export thrice');
      })
    });

  });

  test('Modules exports only once in imported files.', function () {

    window.increment = 0;

    stop();
    modus('moduleTest.testExportsRunOnceExternal', function (imports, exports) {
      imports('fixtures.increment.incrementOne');
      imports('fixtures.increment.incrementTwo');
      imports('fixtures.increment.incrementThree');
      exports(function () {
        start();
        equal(window.increment, 1);
      })
    });

  });

})();