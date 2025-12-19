class Player {
  constructor({x, y, score, id}) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
    this.width = 30;  // Standard avatar size
    this.height = 30;
  }

  movePlayer(dir, speed) {
    if (dir === 'up') this.y -= speed;
    if (dir === 'down') this.y += speed;
    if (dir === 'left') this.x -= speed;
    if (dir === 'right') this.x += speed;
  }

  collision(item) {
    // Axis-Aligned Bounding Box (AABB) collision detection
    if (
      this.x < item.x + item.width &&
      this.x + this.width > item.x &&
      this.y < item.y + item.height &&
      this.y + this.height > item.y
    ) {
      return true;
    }
    return false;
  }

  calculateRank(arr) {
    // Sort players by score descending
    const sorted = arr.sort((a, b) => b.score - a.score);
    
    let rank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id === this.id) {
        rank = i + 1;
        break;
      }
    }
    
    return `Rank: ${rank}/${arr.length}`;
  }
}

export default Player;