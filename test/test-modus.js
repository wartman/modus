describe('modus', function () {

  describe('modus.module', function () {

    // Set modules to NOT automatically enable.
    modus.config('auto enable', false);

    it('creates a module', function (done) {
      modus.createModule('tests/module', function (_) {
        _.exports('foo', 'bar');
      }).on('ready', function () {
        var modExports = modus.getModule('tests/module').getExports();
        expect(modExports.foo).to.equal(bar);
        done();
      }).on('disabled', done).enable();
    });

    it('imports previously defined modules', function (done) {
      modus.createModule('tests/module/dep1', function () {
        this.exports('foo', 'bar');
      });
      modus.createModule('tests/module/imports', function () {
        this.imports('foo').from('tests/module/dep1');
        expect(this.foo).to.equal('bar');
        done();
      }).on('disabled', done).enable();
    })

  });

});