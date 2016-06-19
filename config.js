module.exports = {
    address: '0.0.0.0',
    port: 2555,
    superNodes: [{
    	address: 'router.utorrent.com',
    	port: 6881
    }, {
    	address: 'router.bittorrent.com',	
    	port: 6881
    }, {
    	address: 'dht.transmissionbt.com',
    	port: 6881
    }],
    db: 'mongodb://localhost/dht',
    // redis相关
    redisHost: '127.0.0.1', // 服务器
    redisPort: 6379,
    redisPass: '123456',
    // request周期，越小越快，单位ms
    cycleTimes: 20,
    // 保留多少天的热度
    hotCounts: 14
};