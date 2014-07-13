if (Modus.isServer()) var expect = require('chai').expect;

describe('Modus.EventEmitter', function () {
  
  var emitter;

  beforeEach(function () {
    emitter = new Modus.EventEmitter();
  });

  describe('#on', function () {

    it('registers a callback', function () {
      var iterate = 0;
      emitter.on('test', function() {
        iterate += 1
      });
      emitter.emit('test');
      emitter.emit('test');
      emitter.emit('test');
      expect(iterate).to.equal(3);
    });

    it('registers multiple callbacks per event', function () {
      var iterateOne = 0;
      var iterateTwo = 0;
      emitter.on('test', function () {
        iterateOne += 1;
      });
      emitter.on('test', function () {
        iterateTwo += 1;
      });
      emitter.emit('test');
      emitter.emit('test');
      emitter.emit('test');
      expect(iterateOne).to.equal(3);
      expect(iterateTwo).to.equal(3);
    });

  });

  describe('#once', function () {

    it('runs a callback only once', function () {
      var iterate = 0;
      emitter.once('test', function() {
        iterate += 1
      });
      emitter.emit('test');
      expect(iterate).to.equal(1);
      emitter.emit('test');
      expect(iterate).to.equal(1);
    });

    it('doesn\'t remove on callbacks if registered in the same event', function () {
      var iterateOne = 0;
      var iterateTwo = 0;
      var iterateThree = 0;
      emitter.on('test', function () {
        iterateOne += 1;
      });
      emitter.once('test', function () {
        iterateTwo += 1;
      });
      emitter.once('test', function () {
        iterateThree += 1;
      });
      emitter.emit('test');
      emitter.emit('test');
      emitter.emit('test');
      expect(iterateOne).to.equal(3);
      expect(iterateTwo).to.equal(1);
      expect(iterateThree).to.equal(1);
    });

    it('cleans up if all events are removed', function () {
      var iterateOne = 0;
      var iterateTwo = 0;
      emitter.once('cleanUp', function () {
        iterateOne += 1;
      });
      emitter.once('cleanUp', function () {
        iterateTwo += 1;
      });
      expect(emitter._listeners['cleanUp']).to.be.an('array');
      emitter.emit('cleanUp');
      expect(iterateOne).to.equal(1);
      expect(iterateTwo).to.equal(1);
      expect(emitter._listeners['cleanUp']).to.be.an('undefined');
    });

  })

});