const express = require('express');
//const express = require('express-session');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let connectedClients = [];
let disconnectedClients = [];

io.on('connection', (socket) => {
    socket.clientInfo = null;
    console.log('a user connected');

    socket.on('requestInfo', (id) => {
        id = parseInt(id);
        let currentClient = false;
        disconnectedClients = disconnectedClients.filter((client) => {
            if (client['id'] === id) {
                currentClient = client;
                socket.clientInfo = client;
                connectedClients.push(client);
                return false;
            }
            return true;
        });
        if (currentClient) {
            socket.broadcast.emit("connected", currentClient['nickname']);
        }
        socket.emit("session", currentClient);//Reset session
    });


    socket.on('login', (nickname) => {
        for (let i = 0; i < connectedClients.length; i++) {
            if (connectedClients[i]["nickname"] === nickname) {
                socket.emit("chat message", "Nickname already online");
                return;
            }
        }
        disconnectedClients = disconnectedClients.filter(client => {
            return client["nickname"] !== nickname;
        });

        socket.clientInfo = {
            id: Math.round(Math.random() * 100000),
            nickname: nickname
        }

        socket.emit("session", socket.clientInfo);
        connectedClients.push(socket.clientInfo);
        socket.broadcast.emit("connected", socket.clientInfo['nickname']);
    });


    socket.on('chat message', (msg) => {
        if (!socket.clientInfo) {
            socket.emit('chat message',"hacker detected");
        }
        socket.emit("chat message", [socket.clientInfo['nickname'], msg]);
        socket.broadcast.emit("chat message", [socket.clientInfo['nickname'], msg]);
    });

    socket.on('disconnect', () => {
        if (socket.clientInfo) {
            connectedClients.splice(socket.clientInfo, 1);
            disconnectedClients.push(socket.clientInfo);
            socket.broadcast.emit("disconnected", socket.clientInfo['nickname']);
        }
    });

});


server.listen(80, () => {
    console.log('listening on *:80');
});