require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const helmet = require('helmet'); // Must be version 3.21.3

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// --- SECURITY HEADERS (Helmet v3.21.3) ---
// 1. Prevent sniffing
app.use(helmet.noSniff());

// 2. Prevent XSS
app.use(helmet.xssFilter());

// 3. Prevent Caching (Works in v3.21.3)
app.use(helmet.noCache());

// 4. Spoof Powered-By (Works in v3.21.3)
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

// -----------------------------------------

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/assets', express.static(process.cwd() + '/assets'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// For FCC testing purposes
fccTestingRoutes(app);

// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// --- START SERVER ---
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port 3000');
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});

// --- GAME LOGIC ---
const io = socket(server);

let players = [];
let collectible = {
  x: Math.floor(Math.random() * 500),
  y: Math.floor(Math.random() * 300),
  value: 1,
  id: Date.now()
};

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  const newPlayer = {
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 300),
    score: 0,
    id: socket.id
  };
  
  players.push(newPlayer);

  socket.emit('init', { id: socket.id, players: players, coin: collectible });
  socket.broadcast.emit('new-player', newPlayer);

  socket.on('move-player', (dir, speed) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      if (dir === 'up') player.y -= speed;
      if (dir === 'down') player.y += speed;
      if (dir === 'left') player.x -= speed;
      if (dir === 'right') player.x += speed;
      io.emit('update-player', player);
    }
  });

  socket.on('collision', ({ item, id }) => {
    const player = players.find(p => p.id === id); 
    if (player && item.id === collectible.id) {
      player.score += collectible.value;
      collectible = {
        x: Math.floor(Math.random() * 500),
        y: Math.floor(Math.random() * 300),
        value: 1,
        id: Date.now()
      };
      io.emit('update-player', player);
      io.emit('update-coin', collectible);
    }
  });

  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    io.emit('remove-player', socket.id);
  });
});

module.exports = app;