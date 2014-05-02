(function () {

  module('Modus Static Methods Test', {
    setup: function () {
      Modus.config('root', '');
    }
  });

  test('Saves shim', function (test) {
    Modus.shim('fid', {
      map: 'fid',
      imports: ['foo', 'bin']
    });
    test.deepEqual(Modus.shims.fid, {
      map: 'fid',
      imports: ['foo', 'bin']
    });
  });

  test('map/getMappedPath', function (test) {
    Modus.map('fixtures/map/mapped.js', 'foo.mapped');
    test.equal(Modus.getMappedPath('foo.mapped').src, 'fixtures/map/mapped.js', 'Path was found');
    Modus.map('fixtures/fake/module.js', [
      'foo.fake',
      'foo.fake.*',
      'foo.**.many',
      'foo.*.one'
    ]);
    test.equal(Modus.getMappedPath('foo.fake').src, 'fixtures/fake/module.js', 'Path was found');
    test.equal(Modus.getMappedPath('foo.fake.Bar').src, 'fixtures/fake/module.js', 'Path was found');
    test.equal(Modus.getMappedPath('foo.fake.Baz').src, 'fixtures/fake/module.js', 'Path was found');
    test.equal(Modus.getMappedPath('foo.fake.Foo').src, 'fixtures/fake/module.js', 'Path was found automatically');
    test.equal(Modus.getMappedPath('foo.things.many').src, 'fixtures/fake/module.js', '** matches many segments');
    test.equal(Modus.getMappedPath('foo.things.etc.many').src, 'fixtures/fake/module.js', '** matches many segments');
    test.notEqual(Modus.getMappedPath('foo.things.etc.fud').src, 'fixtures/fake/module.js', '** does not match when last segment is incorrect');
    test.equal(Modus.getMappedPath('foo.things.one').src, 'fixtures/fake/module.js', '* matches one segment');
    test.notEqual(Modus.getMappedPath('foo.things.etc.one').src, 'fixtures/fake/module.js', '* does not match many segments');
  });

  test('Test mapping in urls', function (test) {
    Modus.map('fixtures/fake/*.js', 'fid.*');
    test.equal(Modus.getMappedPath('fid.bin').src, 'fixtures/fake/bin.js', 'Mapped');
    test.notEqual(Modus.getMappedPath('fid.bin.bar').src, 'fixtures/fake/bin/bar.js', '* matches only one');
    Modus.map('fixtures/fake/many/**/*.js', 'fid.**.*');
    test.equal(Modus.getMappedPath('fid.bin.bar').src, 'fixtures/fake/many/bin/bar.js', '** matches many');
    test.equal(Modus.getMappedPath('fid.bin.baz.bar').src, 'fixtures/fake/many/bin/baz/bar.js', '** matches many');
  });

  test('Get shimmed path with getMappedPath', function (test) {
    Modus.shim('foo', {
      map: 'fixtures/shimmed/foo.js'
    });
    test.equal(Modus.getMappedPath('foo').src, 'fixtures/shimmed/foo.js', 'Shimmed path mapped');
  });

})();