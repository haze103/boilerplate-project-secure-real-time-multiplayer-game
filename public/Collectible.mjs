class Collectible {
  constructor({x, y, value, id}) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.id = id;
    this.width = 20; // Standard item size
    this.height = 20;
  }
}

export default Collectible;