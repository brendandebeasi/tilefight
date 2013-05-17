var io = require('socket.io').listen(1338);
var gameData = {
    id          : 1,
    history     : [],
    mode        : 'BLOOM',
    grid        : {
        numRows     : 8,
        numCols     : 8
    },
    rows            : []
};

io.sockets.on('connection', function (socket) {
    socket.emit('game-update', { game: gameData });
    socket.on('new-game', function (data) {

    });
});
