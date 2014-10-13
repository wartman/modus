describe('modus.Module', function () {

  describe('#constructor', function () {

    it('sets the name and factory', function () {
      var factory = function () {this.foo = 'foo'};
      var mod = new modus.Module('tests.constructor', factory);
      expect(mod.getModuleName()).to.equal('tests.constructor');
      expect(mod.getModuleFactory()).to.deep.equal(factory);
    });

  });

  describe('#enableModule', function () {

    // Work on these tests!
    // Need tests to check if module won't try to enable twice, etc.

    var fixture = new modus.Module('tests.fixture.enableModule', function () {
      this.foo = 'foo'
    });

    it('gathers dependencies and runs the provided factory', function (done) {
      var mod = new modus.Module('tests.enableModule', function () {
        this.imports('tests.fixture.enableModule');
      });
      mod.enableModule().then(function () {
        expect(true).to.be.ok;
        done();
      });
    });

  });

  describe('#disableModule', function () {

  });

  describe('#setModuleMeta', function () {

  });

  describe('#getModuleMeta', function () {

  });

  describe('#addModuleDependency', function () {

    it('adds a single dep', function () {
      var mod = new modus.Module();
      mod.addModuleDependency('foo');
      expect(mod.getModuleDependencies()).to.deep.equal(['foo']);
    });

    it('adds arrays of dependencies', function () {
      var mod = new modus.Module();
      // Add a dep first to make sure it isn't overwritten.
      mod.addModuleDependency('foo');
      mod.addModuleDependency(['bin', 'bar']);
      expect(mod.getModuleDependencies()).to.deep.equal(['foo', 'bin', 'bar']);
    });

  });

  describe('#getModuleDependencies', function () {

  });

  describe('#findModuleDependencies', function () {

    it('finds dependencies set with `#imports#from`', function () {
      var mod = new modus.Module('tests.dependencies.from', function () {
        this.imports('bin, bax').from('foo.bar');
        this.imports('bag').from('bin.bax');
      });
      var deps = mod.findModuleDependencies();
      expect(deps).to.deep.equal(['foo.bar', 'bin.bax']);
    });

    it('finds dependencies set with `#imports` and `#imports#as`', function () {
      var mod = new modus.Module('tests.dependencies.imports', function () {
        this.imports('bin.bax');
        this.imports('lorem.ipsum').as('lorem');
      });
      var deps = mod.findModuleDependencies();
      expect(deps).to.deep.equal(['bin.bax', 'lorem.ipsum']);
    });

    it('finds dependencies set with `require` (for AMD modules)', function () {
      var mod = new modus.Module('tests.dependencies.require', function (require) {
        var tests = require('foo/bar');
        var bax = require('foo/bax');
      });
      var deps = mod.findModuleDependencies();
      expect(deps).to.deep.equal(['foo.bar', 'foo.bax']);
    });

  });

  describe('#setModuleFactory', function () {

    it('sets the factory (what did you think would happen?)', function (done) {
      var mod = new modus.Module('tests.factory');
      mod.setModuleFactory(function () {
        this.foo = 'foo';
        expect(true).to.be.ok;
        done();
      });
      mod.enableModule();
    });

    it('handles objects', function (done) {
      var mod = new modus.Module('tests.factory.object');
      mod.setModuleFactory({foo:'foo'});
      mod.enableModule().then(function () {
        expect(mod['default'].foo).to.equal('foo');
        done();
      });
    });

    it('handles arrays', function (done) {
      var mod = new modus.Module('tests.factory.object');
      mod.setModuleFactory(['foo']);
      mod.enableModule().then(function () {
        expect(mod['default']).to.deep.equal(['foo']);
        done();
      });
    });

    it('passes the module as the first argument', function (done) {
      var mod = new modus.Module('tests.factory.context');
      mod.setModuleFactory(function (_) {
        _.foo = 'foo';
        expect(this.foo).to.equal(_.foo);
        expect(this).to.deep.equal(_);
        expect(_.getModuleName()).to.equal('tests.factory.context');
        done();
      });
      mod.enableModule();
    });

    it('runs async when a second argument is passed', function (done) {
      var mod = new modus.Module('tests.factory.async');
      mod.setModuleFactory(function (_, moduleDone) {
        _.foo = 'didn\'t wait';
        setTimeout(function () {
          _.foo = 'foo';
          moduleDone();
        }, 50);
      });
      expect(mod.getModuleMeta('isAsync')).to.be.true;
      mod.enableModule().then(function () {
        expect(mod.foo).to.equal('foo');
        done();
      });
    });

    it('passes `require`, `exports` and `module` when running in AMD mode', function (done) {
      var mod = new modus.Module('tests.factory.amd');
      mod.setModuleMeta('isAmd', true);
      mod.addModuleDependency(['require', 'exports', 'module']);
      mod.setModuleFactory(function (require, exports, module) {
        expect(require).to.be.a('function');
        expect(exports).to.be.an('object');
        expect(module).to.be.an('object');
        done();
      });
      mod.enableModule();
    });

  });

  describe('#imports', function () {

    // Fixture for testing
    var fixture = new modus.Module('tests.fixture', function () {
      this.foo = 'foo';
      this.bar = 'bar';
    });

    // Fixture with default export
    var defFixture = new modus.Module('tests.fixture.def', function () {
      this['default'] = 'foo';
      this.bar = 'bar'
    });
      
    it('automatically names the import if no alias is provided', function (done) {
      var mod = new modus.Module('tests.imports.basic', function () {
        this.imports('tests.fixture');
        expect(this.fixture.foo).to.equal('foo');
        expect(this.fixture.bar).to.equal('bar');
        done();
      })
      mod.enableModule();
    });

    it('imports a `default` property if one exists', function (done) {
      var mod = new modus.Module('tests.imports.def', function () {
        this.imports('tests.fixture.def');
        expect(this.def).to.equal('foo');
        expect(this.def.bar).to.be.an('undefined');
        done();
      });
      mod.enableModule();
    });

    it('aliases an import if an object is provided', function (done) {
      var mod = new modus.Module('tests.imports.aliased', function () {
        this.imports({'tests.fixture': 'aliased'});
        expect(this.aliased.foo).to.equal('foo');
        expect(this.aliased.bar).to.equal('bar');
        expect(this.fixture).to.be.an('undefined');
        done();
      });
      mod.enableModule();
    });

    it('imports relative to the current module', function (done) {
      var mod = new modus.Module('tests.importsRelative', function () {
        this.imports('.fixture');
        expect(this.fixture.foo).to.equal('foo');
        expect(this.fixture.bar).to.equal('bar');
        done();
      })
      mod.enableModule();
    });

    it('imports relative to the current module several steps up', function (done) {
      var mod = new modus.Module('tests.imports.relative', function () {
        this.imports('..fixture');
        expect(this.fixture.foo).to.equal('foo');
        expect(this.fixture.bar).to.equal('bar');
        done();
      })
      mod.enableModule();
    });

    describe('#from', function () {

      it('imports properties from modules', function (done) {
        var mod = new modus.Module('tests.from', function () {
          this.imports('foo', 'bar').from('tests.fixture');
          expect(this.foo).to.equal('foo');
          expect(this.bar).to.equal('bar');
          done();
        });
        mod.enableModule();
      });

      it('aliases imports when an object is provided', function (done) {
        var mod = new modus.Module('tests.from.aliased', function () {
          this.bar = 'not changed';
          this.imports('foo', {'bar': 'aliased'}).from('tests.fixture');
          expect(this.foo).to.equal('foo');
          expect(this.bar).to.equal('not changed');
          expect(this.aliased).to.equal('bar');
          done();
        });
        mod.enableModule();
      });

      it('imports modules using relative paths', function (done) {
        var mod = new modus.Module('tests.fromRelative', function () {
          this.imports('foo', 'bar').from('.fixture');
          expect(this.foo).to.equal('foo');
          expect(this.bar).to.equal('bar');
          done();
        });
        mod.enableModule();
      });

    });

    describe('#as', function () {

      it('aliases imports', function (done) {
        var mod = new modus.Module('tests.imports.as', function () {
          this.imports('tests.fixture').as('bix');
          expect(this.bix.foo).to.equal('foo');
          expect(this.bix.bar).to.equal('bar');
          done();
        });
        mod.enableModule();
      });

      it('avoids naming conflicts', function (done) {
        var mod = new modus.Module('tests.imports.as.conflicts', function () {
          this.fixture = 'old'
          this.imports('tests.fixture').as('bix');
          expect(this.fixture).to.equal('old');
          expect(this.bix.foo).to.equal('foo');
          done();
        });
        mod.enableModule();
      });

    });

  });

});