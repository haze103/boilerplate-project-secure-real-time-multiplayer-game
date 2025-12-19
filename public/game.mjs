import Player from './Player.mjs';
import Collectible from './Collectible.mjs';

const socket = io();
const canvas = document.getElementById('game-window');
const context = canvas.getContext('2d');

let mainPlayer;
let allPlayers = [];
let coin;

// --- SOCKET LISTENERS ---

socket.on('init', ({ id, players, coin: serverCoin }) => {
  // Identify "me"
  const p = players.find(x => x.id === id);
  mainPlayer = new Player(p);
  
  // Instantiate all other players
  allPlayers = players.map(x => new Player(x));
  
  // Instantiate the coin
  coin = new Collectible(serverCoin);
  
  // Start the game loop
  requestAnimationFrame(draw);
});

socket.on('new-player', (obj) => {
  allPlayers.push(new Player(obj));
});

socket.on('update-player', (obj) => {
  const p = allPlayers.find(x => x.id === obj.id);
  if (p) {
    p.x = obj.x;
    p.y = obj.y;
    p.score = obj.score;
    
    // Update mainPlayer ref if it's us (to keep score sync)
    if (mainPlayer.id === obj.id) {
      mainPlayer.score = obj.score;
    }
  }
});

socket.on('update-coin', (obj) => {
  coin = new Collectible(obj);
});

socket.on('remove-player', (id) => {
  allPlayers = allPlayers.filter(p => p.id !== id);
});


// --- INPUT HANDLING ---
document.onkeydown = (e) => {
  const dir = e.key === 'ArrowUp' || e.key === 'w' ? 'up'
            : e.key === 'ArrowDown' || e.key === 's' ? 'down'
            : e.key === 'ArrowLeft' || e.key === 'a' ? 'left'
            : e.key === 'ArrowRight' || e.key === 'd' ? 'right'
            : null;
            
  if (dir && mainPlayer) {
    const speed = 10;
    // Move Locally (Client Prediction)
    mainPlayer.movePlayer(dir, speed);
    // Send to Server
    socket.emit('move-player', dir, speed);
  }
};


// --- DRAW LOOP ---
function draw() {
  // Clear Screen
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#220';
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Coin
  if (coin) {
    context.fillStyle = 'gold';
    context.fillRect(coin.x, coin.y, coin.width, coin.height);
    context.strokeStyle = 'white';
    context.strokeRect(coin.x, coin.y, coin.width, coin.height);
  }

  // Draw Players
  allPlayers.forEach(p => {
    if (p.id === mainPlayer.id) {
      context.fillStyle = '#00f'; // Blue for me
    } else {
      context.fillStyle = '#f00'; // Red for enemies
    }
    context.fillRect(p.x, p.y, p.width, p.height);
  });

  // Collision Logic
  if (mainPlayer && coin) {
    if (mainPlayer.collision(coin)) {
      socket.emit('collision', { item: coin, id: mainPlayer.id });
    }
  }

  // Draw Rank text
  if (mainPlayer) {
    context.fillStyle = 'white';
    context.font = '20px "Courier New"';
    const rankText = mainPlayer.calculateRank(allPlayers);
    context.fillText(rankText, 10, 30);
  }

  requestAnimationFrame(draw);
}