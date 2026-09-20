/* AI门道原创示例，MIT。Phaser 3.90.0 */
class CatchGame extends Phaser.Scene {
  constructor() { super('catch'); }
  create() {
    this.score = 0;
    this.remaining = 30;
    this.finished = false;
    this.spawnLeft = 0.6;
    this.coins = [];
    this.add.rectangle(240, 320, 480, 640, 0x102538);
    this.add.text(20, 18, 'CATCH THE GOLD', { fontSize: '22px', color: '#9befd7' });
    this.hud = this.add.text(20, 58, '', { fontSize: '22px' });
    this.player = this.add.rectangle(240, 580, 90, 20, 0x72ecc4);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.paintHud();
  }
  paintHud() { this.hud.setText(`得分 ${this.score}   剩余 ${Math.ceil(this.remaining)} 秒`); }
  endGame() {
    if (this.finished) return;
    this.finished = true;
    this.remaining = 0;
    this.paintHud();
    this.add.rectangle(240, 300, 390, 140, 0x07131f, 0.95);
    const restart = this.add.text(240, 300, `本局 ${this.score} 分\n点击重新开始`, {
      fontSize: '28px', color: '#fff1b4', align: 'center', lineSpacing: 16,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.once('pointerdown', () => this.scene.restart());
  }
  update(_time, delta) {
    if (this.finished) return;
    const dt = Math.min(delta / 1000, 0.05);
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) { this.endGame(); return; }
    const pointer = this.input.activePointer;
    if (pointer.isDown) this.player.x = pointer.x;
    else this.player.x += ((this.cursors.right.isDown ? 1 : 0) - (this.cursors.left.isDown ? 1 : 0)) * 360 * dt;
    this.player.x = Phaser.Math.Clamp(this.player.x, 45, 435);
    this.spawnLeft -= dt;
    if (this.spawnLeft <= 0) {
      this.coins.push(this.add.circle(Phaser.Math.Between(20, 460), -12, 12, 0xffd166));
      this.spawnLeft += 0.6;
    }
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.y += 230 * dt;
      const caught = Math.abs(coin.x - this.player.x) <= 57 && Math.abs(coin.y - this.player.y) <= 22;
      if (caught) this.score++;
      if (caught || coin.y > 665) { coin.destroy(); this.coins.splice(i, 1); }
    }
    this.paintHud();
  }
}
window.workshopGame = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 480, height: 640,
  backgroundColor: '#102538', scene: CatchGame,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
