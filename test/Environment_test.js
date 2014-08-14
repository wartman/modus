if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Environment', function () {

  describe('#constructor', function () {

    it('parses name', function () {
      var actual = new modus.Environment('tests.env.constructor');
      expect(actual.__namespace).to.equal('tests.env');
      expect(actual.__name).to.equal('tests.env.constructor');
    });

  });

  describe('#imports', function () {

    it('imports `default` string is passed', function () {
      var target = new modus.Environment('tests.import.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Environment('tests.import.string');
      actual.imports('target').from('.stringTarget');
      expect(actual.target).to.equal('String Target');
    });

    it('uses `as` to alias imports', function () {
      var target = new modus.Environment('tests.importAs.stringTarget');
      target['default'] = 'String Target';
      var actual = new modus.Environment('tests.importAs.string');
      actual.imports('.stringTarget').as('foo');
      expect(actual.foo).to.equal('String Target');
    });

    it('imports an entire module if `default` is not set and a string is passed', function () {
      var target = new modus.Environment('tests.import.stringAllTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Environment('tests.import.stringAll');
      actual.imports('target').from('.stringAllTarget');
      expect(actual.target).to.deep.equal({foo:'foo', bar:'bar'});
    });

    it('imports components if array is passed', function () {
      var target = new modus.Environment('tests.import.stringArrayTarget');
      target.foo = 'foo';
      target.bar = 'bar';
      var actual = new modus.Environment('tests.import.stringArray');
      actual.imports(['foo', 'bar']).from('.stringArrayTarget');
      expect(actual.foo).to.equal('foo');
      expect(actual.bar).to.equal('bar');
    });

  });

});