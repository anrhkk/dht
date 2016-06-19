'use strict';

const redis = require("redis");
const config = require('./config');
const client = redis.createClient(config.redisPort, config.redisHost, {
    auth_pass: config.redisPass
  });

client.on("error", function (error) {
  console.error('redis error: ' + error);
});

client.on('end', function () {
  console.info('redis服务器连接被断开');
});
// 保存infohash
module.exports.sadd = function (infohash) {
  client.sadd('infohash', infohash);
};

// 随机取出并且删除一个infohash
module.exports.spop = function (callback) {
  client.spop('infohash', callback);
};