require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const expect = require('chai');
const socket = require('socket.io');
const helmet = require('helmet');

const fccTestingRoutes = require('./routes/fcctesting.js');
const runner = require('./test-runner.js');

const app = express();

// --- 1. SECURITY & HEADER CONFIGURATION ---
// Place this BEFORE static files to ensure headers are applied to everything

// Prevent sniffing the MIME type
app.use(helmet.noSniff());

// Prevent XSS attacks
app.use(helmet.xssFilter());

// Spoof the "Powered By" header
app.use(helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }));

// Manually set cache control headers to satisfy all test requirements
app.use(function (req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// --- 2. STATIC FILES & MIDDLEWARE ---
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

// --- 3. START SERVER ---
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

// --- 4. GAME LOGIC (SOCKET.IO) ---
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

  // Create new player object
  const newPlayer = {
    x: Math.floor(Math.random() * 500),
    y: Math.floor(Math.random() * 300),
    score: 0,
    id: socket.id
  };
  
  players.push(newPlayer);

  // Send initialization data to the client who just connected
  socket.emit('init', { id: socket.id, players: players, coin: collectible });

  // Broadcast new player to everyone else
  socket.broadcast.emit('new-player', newPlayer);

  // Handle movement
  socket.on('move-player', (dir, speed) => {
    const player = players.find(p => p.id === socket.id);
    if (player) {
      if (dir === 'up') player.y -= speed;
      if (dir === 'down') player.y += speed;
      if (dir === 'left') player.x -= speed;
      if (dir === 'right') player.x += speed;
      
      // Sync update to everyone
      io.emit('update-player', player);
    }
  });

  // Handle collision/scoring
  socket.on('collision', ({ item, id }) => {
    const player = players.find(p => p.id === id); 
    
    // Check if the item ID matches the current server collectible
    if (player && item.id === collectible.id) {
      player.score += collectible.value;

      // Respawn collectible
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

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    players = players.filter(p => p.id !== socket.id);
    io.emit('remove-player', socket.id);
  });
});

module.exports = app; // For testing