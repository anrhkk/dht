'use strict';
const mongoose = require('mongoose'), _ = require('lodash'), moment = require('moment'),parseTorrent = require('parse-torrent'),config = require('./config');
mongoose.Promise = require('bluebird');
mongoose.connect(config.db);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongodb connect failed'));
db.once('open', console.log.bind(console, 'mongodb connect success'));

const TorrentSchema = mongoose.Schema({
  _id: { type: String, required: true },// 设置_id为infohash
  name: { type: String, required: true },// name 资源名称
  type: { type: String },// type 资源类型
  size: { type: Number },// size 资源总大小
  magnet: { type: String},
  files: [// files 包含文件
    {
      _id: false,
      name: { type: String },// name 文件名
      size: { type: Number, default: 0 }// size 文件大小
    }
  ],
  hot: { type: Number, default: 0 },// hot 最新热度值
  hots: [// hots 最近2周热度值, key:value 例如: 12-20:1000
    {
      _id: false,
      time: { type: String },// 时间
      value: { type: Number, default: 0 }// 热度值
    }
  ],
  created_at: { type: Date, default: Date.now },// createDate 收录时间
  updated_at: { type: Date, default: Date.now },// updateDate 更新时间
  disable: { type: Boolean }// disable 是否被禁用
});
const TorrentInfo= mongoose.model('torrents', TorrentSchema);

var getFileListAndSize, getFileType, getTorrentInfo;

exports.saveInfo = function(infohash,torrentData) {
  const dataInfo = torrentData.info;
  const torrentInfo = getTorrentInfo(dataInfo);
	const infoMongodb = new TorrentInfo({
    _id: infohash,
    name:torrentInfo.name,
    files:torrentInfo.files,
    type:torrentInfo.type,
    size:torrentInfo.size,
    magnet:parseTorrent.toMagnetURI({
      infoHash: infohash
    })
  });
  infoMongodb.save().then(function(savedInfo) {
    console.log(JSON.stringify(savedInfo));
  }).catch(function(err) {
    if (err) {
      return console.error('save failed');
    }
  });
};

// 根据infohash获取资源
exports.getTorrentByInfohash = function(infohash, callback) {
  TorrentInfo.findOne({_id: infohash}, callback);
};

// 热度+1
exports.changeHot = function(infohash) {
  TorrentInfo.findOne({_id: infohash}, function (err, resource) {
    if (err || !resource) {
      return;
    }

    // 只保留2周
    for (let i = resource.hots.length - 1; i >= 0; i--) {
      if (moment.utc(resource.hots[i].time).isBefore(moment.utc().subtract(config.hotCounts || 14, 'day'))) {
        resource.hots.splice(i, 1);// 删除
      } else {
        break;
      }
    }

    // 更新最近2周的热度
    var now = moment.utc().format('YYYY-MM-DD');
    if (!resource.hots || resource.hots.length <= 0) {
      resource.hots = [
        {time: now, value: 1}
      ];
    } else if (moment.utc(now).isSame(resource.hots[0].time, 'day')) {
      ++resource.hots[0].value;
    } else {
      resource.hots.unshift({time: now, value: 1});
    }

    //刷新最新热度
    resource.hot = resource.hots[0].value;

    // 刷新更新时间
    resource.updated_at = moment.utc();

    // 保存
    resource.markModified('hots');
    resource.save();
  });
};

getTorrentInfo = function(dataInfo){
  if (dataInfo.files) {
    let fileListAndSize = getFileListAndSize(dataInfo.files);
    return {
      // 种子文件名
      name: (dataInfo['name.utf-8'] || dataInfo['name']).toString(),
      // 主文件类型
      type: getFileType(dataInfo.files),
      // 包含的文件列表
      files: fileListAndSize.list,
      // 总大小
      size: fileListAndSize.size
    };
  } else {
    let name = (dataInfo['name.utf-8'] || dataInfo['name']).toString(),
      _split = name.split('.'),
      type = _split.length <= 0 ? '' : _split[_split.length - 1];

    return {
      name: name,
      type: type,
      files: {
        name: name,
        size: dataInfo.length
      },
      size: dataInfo.length
    };
  }
};

// 格式化文件列表
getFileListAndSize = function (list) {
  let result = [], size = 0;

  list.map(function (currentValue) {
    var names = currentValue['path.utf-8'] || currentValue['path'],
      item = {
        size: currentValue.length, // 文件大小
        name: names[names.length - 1].toString() // 文件名
      };

    result.unshift(item);

    size += currentValue.length;
  });

  return {
    list: result,
    size: size
  };
};

// 获取主文件类型
getFileType = function (list) {
  if (!list || list.length <= 0) {
    return '';
  }

  let mainFile = _.max(list, 'length'),
    mainFileName = mainFile['path.utf-8'] || mainFile['path'],
    _split = mainFileName[mainFileName.length - 1].toString().split('.');

  return _split.length <= 0 ? '' : _split[_split.length - 1];
};
