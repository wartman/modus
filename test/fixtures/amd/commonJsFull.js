define(function (require, exports, module) {
  var four = require('./four').four;
  module.exports = {check: 'commonJsFull'};
  module.exports.four = four;
});