'use strict';
const fs = require('fs'),
  path = require('path'),
  async = require('async'),
  util = require('util'),
  parseTorrent = require('parse-torrent'),
  redis = require('./redis'),
  mongodb = require('./mongodb');
var run, next;

run = function () {
  // 随机取出并且删除一个infohash
  redis.spop(function (error, infohash) {
    if (error || !infohash) {
      console.log('waiting.......');
      setTimeout(next, 3000);
      return;
    }
    // 转为大写
    var _infohash = infohash.toUpperCase();
    // 随机生成一个队列
    var list = [],urls = [
      util.format('http://bt.box.n0808.com/%s/%s/%s.torrent', _infohash.substr(0, 2), _infohash.substr(_infohash.length - 2, 2), _infohash),
      util.format('http://zoink.it/torrent/%s.torrent', _infohash),
      util.format('http://torcache.net/torrent/%s.torrent', _infohash)
    ];
    list.push(urls.splice(Math.floor(urls.length * Math.random()), 1)[0]);
    while (urls.length) {
      list.push(Math.random() > 0.5 ? urls.pop() : urls.shift());
    }

    // 按照队列的顺序下载资源
    async.whilst(function () {
      return list.length > 0;
    }, function (callback) {
      var url = list.pop(),timer = null;

      // 下载3分钟，返回失败
      timer = setTimeout(function () {
        callback(null);
      }, 3 * 60 * 1000);

      parseTorrent.remote(url, function (err, parsedTorrent) {
        clearTimeout(timer);
        if (err) {
          callback(null);// 下载失败，但是这里要响应为'成功'，以进入下一个地址的下载
        } else {
          mongodb.getTorrentByInfohash(infohash, function (error, value) {
            if (error) {
              console.error(error);
            }
            if (!value) {
              mongodb.saveInfo(infohash, parsedTorrent);
            } else {
              // 更新hotpeers
              mongodb.changeHot(infohash);
            }
          });
          callback('success');
        }
      });
    }, function (err) {
      if (!err) {// err存在，主动断开，表示下载成功
        // 下载失败，记录下来
        console.log('fail: ' + _infohash);
      }
      next();
    });
  });
};

next = function () {
  setImmediate(run);
};

run();