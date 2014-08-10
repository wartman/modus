if (modus.isServer()) var expect = require('chai').expect;

describe('Vendor', function () {

  before(function () {
    modus.config({
      maps: {
        'jquery': '../node_modules/jquery/dist/jquery.min',
        'underscore': '../node_modules/underscore/underscore-min',
        'backbone': '../node_modules/backbone/backbone-min'
      }
    });
  });

  describe('jquery', function () {
    it('gets imported', function (done) {
      modus.module('tests.jQuery', function () {
        this.imports('$').from('jquery');
        expect(this.$).to.be.a('function');
        expect(this.$).to.deep.equal($);
        done();
      });
    });
  });

  describe('underscore', function () {

    it('gets imported', function (done) {
      modus.module('tests.underscore', function () {
        this.imports('_').from('underscore');
        expect(this._).to.be.a('function');
        expect(this._).to.deep.equal(_);
        done();
      });
    });

  });

  describe('backbone', function () {

    it('gets imported', function (done) {
      modus.module('tests.backbone', function () {
        this.imports('Backbone').from('backbone');
        expect(this.Backbone).to.be.an('object');
        expect(this.Backbone).to.deep.equal(Backbone);
        done();
      });
    });

    it('imports components', function (done) {
      modus.module('tests.backboneComponents', function () {
        this.imports(['View', 'Model']).from('backbone');
        expect(this.View).to.be.a('function');
        expect(this.View).to.deep.equal(Backbone.View);
        expect(this.Model).to.be.a('function');
        expect(this.Model).to.deep.equal(Backbone.Model);
        done();
      });
    });

  })

});