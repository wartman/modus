(function () {

  // er... none of this is actually accessable. Hm.
  module('Modus Helpers Test');

  test('create/getObjectByName', function (test) {
    createObjectByName('helper.one', 'foo');
    test.equal(getObjectByName('helper.one'), helper.one, 'Created and got');
    var ctx = {};
    createObjectByName('helper.one', 'foo', ctx);
    test.equal(getObjectByName('helper.one', ctx), ctx.helper.one, 'Got from context');
  });
  
})();