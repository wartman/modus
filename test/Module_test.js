if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Module', function () {

  describe('#constructor', function () {

    it('parses name', function () {
      var actual = new modus.Module('tests.Module.constructor');
      expect(actual.getModuleName()).to.equal('tests.Module.constructor');
    });

    it('registers a factory', function () {
      var factory = function () {this.registered = 'registered';};
      var actual = new modus.Module('tests.Module.constructorFactroy', factory);
      expect(actual.getModuleFactory().toString()).to.equal(factory.toString());
    })

  });

  describe('#registerModule', function () {
    
    it('registers the module with Modus and sets the name', function () {
      var actual = new modus.Module();
      actual.registerModule('tests.registerModule');
      expect(actual.getModuleName()).to.equal('tests.registerModule');
      expect(modus.getModule('tests.registerModule')).to.deep.equal(actual);
    });

  });

  describe('#getModuleName', function () {
    it('returns the name', function () {
      var modTest = new modus.Module('tests.name.test');
      expect(modTest.getModuleName()).to.equal('tests.name.test');
    });
  });

  describe('#setModuleFactory', function () {

    it('registers a factory', function () {
      var actual = new modus.Module('tests.moduleFactory');
      var factory = function () {this.registered = 'registered';}
      actual.setModuleFactory(factory);
      expect(actual.getModuleFactory().toString()).to.equal(factory.toString());
    });

    it('will run async if an argument is passed.', function (done) {
      var actual = new modus.Module('tests.registerModule.async');
      actual.setModuleFactory(function (moduleDone) {
        var self = this;
        this.foo = 'didn\'t wait';
        setTimeout(function () {
          self.foo = 'waited';
          moduleDone();
        }, 200);
      });
      expect(actual.getModuleMeta('isAsync')).to.be.true;
      actual.enableModule().then(function () {
        expect(actual.foo).to.equal('waited');
        done();
      });
    });

  });

  describe('#findModuleDependencies', function () {

    it('finds deps from various methods', function () {
      var actual = new modus.Module('tests.findModuleDependencies.basic');
      actual.setModuleFactory(function () {
        this.imports('tests.one').as('foo');
        this.imports('bar', 'baz').from('tests.two');
        var bin = this.require('tests.three');
      });
      actual.findModuleDependencies();
      expect(actual.getModuleDependencies()).to.have.members(['tests.one', 'tests.two', 'tests.three']);
    });

    it('ignores commented-out items', function () {
      var actual = new modus.Module('tests.findModuleDependencies.ignore')
      actual.setModuleFactory(function () {
        this.imports('tests.one').as('foo');
        this.imports('bar', 'baz').from('tests.two');
        //this.imports('bar', 'baz').from('tests.three');
        /*this.imports('bar', 'baz').from('tests.four');*/
      });
      actual.findModuleDependencies();
      expect(actual.getModuleDependencies()).to.have.members(['tests.one', 'tests.two']);
    });

  });

  describe('#imports', function () {

    it('imports `default` using `imports().as()`', function () {
      var target = new modus.Module('tests.import.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Module('tests.import.string');
      actual.imports('.stringTarget').as('target');
      expect(actual.target).to.equal('String Target');
    });

    it('uses `as` to alias imports', function () {
      var target = new modus.Module('tests.importAs.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Module('tests.importAs.string');
      actual.imports('.stringTarget').as('foo');
      expect(actual.foo).to.equal('String Target');
    });

    it('imports an entire module if `default` is not set and a string is passed', function () {
      var target = new modus.Module('tests.import.stringAllTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Module('tests.import.stringAll');
      actual.imports('.stringAllTarget').as('target');
      expect(actual.target).to.deep.equal({foo:'foo', bar:'bar'});
    });

    it('imports components when `from` is used in the chain', function () {
      var target = new modus.Module('tests.import.stringArrayTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Module('tests.import.stringArray');
      actual.imports('foo', 'bar').from('.stringArrayTarget');
      expect(actual.foo).to.equal('foo');
      expect(actual.bar).to.equal('bar');
    });

  });

});