if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Namespace', function () {

  describe('#constructor', function () {

    it('parses name', function () {
      var actual = new modus.Namespace('tests.env.constructor');
      expect(actual.moduleName).to.equal('tests.env.constructor');
    });

  });

  describe('#imports', function () {

    it('imports `default` using `imports().as()`', function () {
      var target = new modus.Namespace('tests.import.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Namespace('tests.import.string');
      actual.imports('.stringTarget').as('target');
      expect(actual.target).to.equal('String Target');
    });

    it('uses `as` to alias imports', function () {
      var target = new modus.Namespace('tests.importAs.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Namespace('tests.importAs.string');
      actual.imports('.stringTarget').as('foo');
      expect(actual.foo).to.equal('String Target');
    });

    it('imports an entire module if `default` is not set and a string is passed', function () {
      var target = new modus.Namespace('tests.import.stringAllTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Namespace('tests.import.stringAll');
      actual.imports('.stringAllTarget').as('target');
      expect(actual.target).to.deep.equal({foo:'foo', bar:'bar'});
    });

    it('imports components when `from` is used in the chain', function () {
      var target = new modus.Namespace('tests.import.stringArrayTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Namespace('tests.import.stringArray');
      actual.imports('foo', 'bar').from('.stringArrayTarget');
      expect(actual.foo).to.equal('foo');
      expect(actual.bar).to.equal('bar');
    });

  });

});