# Cocos Creator + AI 实战：制作30秒点击计分游戏

中文逐步搭建：创建Canvas与Game节点、挂载完整TypeScript组件、生成目标、处理点击、计分倒计时和重开。

## 01 · 要完成什么，以及源码包是什么

这是一款点击反应游戏：按开始后，绿色圆点随机出现；点中加1分，未点中的目标每1.2秒换位置。30秒结束后显示得分，可重新开始。
下载包提供完整TargetGame.ts组件与中文搭建说明，不是已打包的游戏安装包。我们使用Graphics画图和系统Label，因此无需图片、SpriteFrame或第三方插件。请准备Cocos Creator 3.8.x，示例类型检查使用本机3.8.8的引擎声明。

## 02 · 创建工程与场景，先把节点放对

在Dashboard中使用Creator 3.8.x新建Empty(2D)项目，创建并保存一个2D场景为Main。场景应有Canvas及其2D相机；如果没有，通过层级面板创建2D对象→Canvas。
把Canvas的设计分辨率设为640×720，采用按宽度适配；在Canvas下创建空节点Game，确认其UITransform组件存在。Game的位置设为(0,0,0)、缩放(1,1,1)，锚点(0.5,0.5)，使用UI_2D层。
本例所有元素位于Game的本地坐标中，原点在画布中央。不要把Game挂在相机下，也不要同时在另一个节点挂第二份TargetGame。

## 03 · 导入脚本并挂载一次

在assets下创建scripts文件夹，把下载包的TargetGame.ts复制进去，等待编辑器完成编译。选中Game节点，把脚本拖到属性检查器，或通过添加组件搜索TargetGame。
不需要在属性检查器手工绑定按钮和Label，脚本在start里创建它们。保存场景后点预览；初始画面应有说明文字和开始按钮，点击按钮后出现绿色目标。
如果组件显示Missing Script，确认文件名TargetGame.ts、类名TargetGame、装饰器名三者一致，再检查编辑器控制台第一条编译错误。

## 04 · 完整TargetGame.ts

先运行这份完整组件，再分段修改。UITransform决定点击区域，Graphics负责画面，Node.EventType.TOUCH_END负责输入。鼠标点击在浏览器预览中也可触发UI触摸事件。

```typescript
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

```

## 05 · 圆形画面与矩形点击区域

target的Graphics绘制半径32的圆，UITransform大小64×64决定默认点击区域。也就是说，四角透明部分在本例中仍可点击，这是有意使用的入门简化。若要求严格圆形命中，需要把触摸点转换为目标本地坐标，再判断x²+y²是否小于32²。
随机位置x为-250到250，y为-200到200；留出上方计分区域和边缘空间。换成不同设计分辨率时，要一并调整这个范围，不能只扩大Canvas。

## 06 · 为什么点击回调要检查当前目标

Cocos的destroy在帧末处理。一个目标点中后，clearTarget先将其停用，再销毁并清空引用；回调还检查this.target是否仍是该节点，防止一帧内重复输入使分数多加。
新目标由spawnLeft控制，点中后等待0.12秒出现下一颗；未点中则最多等待1.2秒刷新。这里没有每局添加一个新的schedule任务，所以重开不会叠加计时器。

## 07 · 结束与重开只重置状态

remaining为0时先关闭playing，再清理目标、更新文本、显示开始按钮。按钮监听只在start注册一次；restart仅重置分数、时间和目标，不注册第二次监听。
update首先检查playing，不在游戏中时不推进逻辑。Math.min(deltaTime,0.05)避免恢复后台时一帧跳过很长时间；这也意味着倒计时按模拟时间累计，而非严格现实时间。

## 08 · AI改动练习：增加连击机制

先完成无AI版本，再用下面任务练习受控修改。只把TargetGame.ts和版本发给助手，不需要上传整个项目。让AI说明状态何时重置，比要求它“做得更好看”更容易验收。

```text
我使用Cocos Creator 3.8.x，这份TargetGame.ts已经能运行。请增加连击：每次命中连击+1；目标自然超时则连击清零；每连续命中5次额外加2分；重开清零。保持现有坐标和触摸事件。请给出需要新增的字段、修改方法、以及命中第5次/超时/重开三个测试步骤。
```

## 09 · 排错、验收与发布

按钮看得见但点不到：检查Game是否有UITransform、是否在Canvas下、节点层是否UI_2D，以及是否被其他全屏UI遮挡；画面完全空白：先检查Canvas相机和脚本编译；点一次加两分：检查是否挂了两份组件。
验收：开始前无目标；点中只加1；未点中会换位置；到时目标消失；结束后点击原位置不再加分；重开归零且只有一个目标。
发布时在构建面板选Web Mobile，加入Main场景并设为启动场景，构建后用静态服务器打开输出目录。微信小游戏需要单独选择目标平台、配置AppID并在微信开发者工具中测试，本文不把Web预览等同于小游戏审核通过。

## 参考资料

- Cocos官方中文：第一个2D游戏 https://docs.cocos.com/creator/3.8/manual/zh/getting-started/first-game-2d/
- Cocos官方中文：Graphics https://docs.cocos.com/creator/3.8/manual/zh/ui-system/components/editor/graphics.html
- Cocos官方中文：构建发布 https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/build-panel.html

本站原创示例代码使用MIT许可；第三方引擎保留各自许可。
