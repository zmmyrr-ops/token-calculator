import { _decorator, Component, Node, UITransform, Graphics, Color, Label } from 'cc';
const { ccclass } = _decorator;

@ccclass('TargetGame')
export class TargetGame extends Component {
  private score = 0;
  private remaining = 30;
  private spawnLeft = 0;
  private playing = false;
  private target: Node | null = null;
  private hud!: Label;
  private startButton!: Node;

  start() {
    this.node.getComponent(UITransform)!.setContentSize(640, 720);
    const background = this.node.addComponent(Graphics);
    background.fillColor = new Color(12, 27, 43);
    background.rect(-320, -360, 640, 720);
    background.fill();
    this.hud = this.makeLabel('点击圆点 · 30秒挑战', 0, 300, 26);
    this.startButton = new Node('StartButton');
    this.startButton.parent = this.node;
    this.startButton.layer = this.node.layer;
    this.startButton.addComponent(UITransform).setContentSize(240, 80);
    const g = this.startButton.addComponent(Graphics);
    g.fillColor = new Color(63, 116, 131);
    g.roundRect(-120, -40, 240, 80, 12); g.fill();
    const label = this.makeLabel('开始 / 再来一局', 0, 0, 24);
    label.node.parent = this.startButton;
    // 监听仅注册一次，重开时只清理状态。
    this.startButton.on(Node.EventType.TOUCH_END, this.restart, this);
  }
  private makeLabel(text: string, x: number, y: number, fontSize: number): Label {
    const n = new Node('Text'); n.parent = this.node; n.layer = this.node.layer; n.setPosition(x, y);
    n.addComponent(UITransform).setContentSize(600, 60);
    const label = n.addComponent(Label);
    label.string = text; label.fontSize = fontSize; label.lineHeight = fontSize + 8;
    label.color = new Color(226, 247, 241);
    return label;
  }
  restart() {
    this.clearTarget();
    this.score = 0; this.remaining = 30; this.spawnLeft = 0;
    this.playing = true; this.startButton.active = false;
    this.refreshHud();
  }
  private clearTarget() {
    if (!this.target) return;
    // destroy在帧末执行，先停用，避免一帧内再次命中。
    this.target.active = false; this.target.destroy(); this.target = null;
  }
  private spawnTarget() {
    this.clearTarget();
    const n = new Node('Target'); n.parent = this.node; n.layer = this.node.layer;
    n.setPosition(Math.random() * 500 - 250, Math.random() * 400 - 200);
    n.addComponent(UITransform).setContentSize(64, 64);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(109, 237, 197); g.circle(0, 0, 32); g.fill();
    this.target = n;
    n.on(Node.EventType.TOUCH_END, () => {
      if (!this.playing || this.target !== n) return;
      this.score++; this.clearTarget(); this.spawnLeft = 0.12;
      this.refreshHud();
    });
  }
  private refreshHud() {
    this.hud.string = `得分 ${this.score}  ·  剩余 ${Math.ceil(this.remaining)} 秒`;
  }
  update(deltaTime: number) {
    if (!this.playing) return;
    const dt = Math.min(deltaTime, 0.05);
    this.remaining = Math.max(0, this.remaining - dt);
    this.spawnLeft -= dt;
    if (this.remaining <= 0) {
      this.playing = false; this.clearTarget();
      this.hud.string = `时间到！本局 ${this.score} 分`;
      this.startButton.active = true;
      return;
    }
    if (this.spawnLeft <= 0) { this.spawnTarget(); this.spawnLeft = 1.2; }
    this.refreshHud();
  }
  onDestroy() {
    this.startButton?.off(Node.EventType.TOUCH_END, this.restart, this);
    this.clearTarget();
  }
}
