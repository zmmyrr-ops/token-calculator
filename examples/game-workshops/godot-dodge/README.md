# Godot + AI 实战：从零做一个可重开的躲避游戏

中文逐步实战：建工程、画角色、实现移动与敌人、检测碰撞、计时并重开。附可导入工程与完整GDScript。

## 01 · 先看成品规则与工程结构

本例是一局不断下落红色圆点的躲避游戏。玩家是底部绿色圆点，按左右方向键移动；手机触摸时朝手指横坐标移动。碰到红点立即结束，显示存活秒数，点击按钮重新开始。
这是本站原创的代码绘图练习，不依赖图片、音乐或付费素材，也不是官方Dodge the Creeps项目的翻译。先做一个单场景闭环，再拆成多个场景，能减少初学者在资源绑定上的干扰。
下载工程直接导入project.godot可以先体验完整结果；想从零学习，请按下面步骤创建同样的文件。工程只有project.godot、main.tscn、main.gd，以及供维护者运行的test.gd。

## 02 · 创建项目和唯一主场景

使用Godot 4.x标准版，本例实际检查版本为4.7.2。新建项目，渲染器选兼容模式。创建Node2D根节点，命名Main，保存为main.tscn。给根节点附加脚本main.gd。
在项目设置→显示→窗口中，把视口宽度设为640、高度720。第一次按F6运行当前场景，应该看见空窗口；按F5运行整个项目时选择main.tscn为主场景。不要把脚本挂到一个叫Main的普通文件夹上。
不想手工设置时，可以直接使用下载包里的工程配置；无需安装任何AI或MCP插件。

## 03 · 先理解状态，避免把画面当成数据

player保存玩家中心坐标；enemies是敌人坐标数组；elapsed是本局累计时间；spawn_left是距离下一次生成的倒计时；running决定是否推进游戏。
坐标原点在左上角，x向右、y向下。玩家从(320,620)开始，敌人在y=-20生成、向下移动。角色半径18，敌人半径15，所以两者圆心距离小于33就算碰撞。
本例使用几何碰撞教学，没有接物理引擎。将来换成复杂地图时应评估Area2D或CharacterBody2D；不要把圆形距离判定当成任何游戏都适用的碰撞方案。

## 04 · 完整主脚本：复制到main.gd

把默认脚本全部替换为下面这份代码，保存后按F6。第一屏应看见绿色玩家和开始按钮；点击开始，红色圆点开始下落。下面代码与下载工程的main.gd保持一致。
如果复制时缩进变成空格与Tab混用，先在脚本编辑器统一缩进，再看底部第一条解析错误。

```gdscript
extends Node2D

const SIZE := Vector2(640, 720)
const PLAYER_RADIUS := 18.0
var player := Vector2(320, 620)
var enemies: Array[Vector2] = []
var elapsed := 0.0
var spawn_left := 0.0
var running := false
var touch_x := -1.0
var rng := RandomNumberGenerator.new()
var hud := Label.new()
var button := Button.new()

func _ready() -> void:
	rng.randomize()
	hud.position = Vector2(24, 18)
	hud.add_theme_font_size_override("font_size", 24)
	add_child(hud)
	button.position = Vector2(210, 300)
	button.size = Vector2(220, 64)
	button.text = "开始 / 重新开始"
	button.pressed.connect(start_game)
	add_child(button)
	update_hud()
	queue_redraw()

func start_game() -> void:
	player = Vector2(320, 620)
	enemies.clear()
	elapsed = 0.0
	spawn_left = 0.4
	touch_x = -1.0
	running = true
	button.hide()
	update_hud()
	queue_redraw()

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		touch_x = event.position.x if event.pressed else -1.0
	elif event is InputEventScreenDrag:
		touch_x = event.position.x

func _process(delta: float) -> void:
	if not running:
		return
	# 暂时离开窗口后，不让一次大步进跳过碰撞。
	var dt := minf(delta, 0.05)
	elapsed += dt
	var axis := Input.get_axis("ui_left", "ui_right")
	if touch_x >= 0.0:
		player.x = move_toward(player.x, touch_x, 360.0 * dt)
	else:
		player.x += axis * 360.0 * dt
	player.x = clampf(player.x, PLAYER_RADIUS, SIZE.x - PLAYER_RADIUS)
	spawn_left -= dt
	if spawn_left <= 0.0:
		enemies.append(Vector2(rng.randf_range(20.0, 620.0), -20.0))
		spawn_left = maxf(0.18, 0.65 - elapsed * 0.006)
	for i in range(enemies.size() - 1, -1, -1):
		enemies[i].y += (200.0 + elapsed * 3.0) * dt
		if enemies[i].distance_to(player) < PLAYER_RADIUS + 15.0:
			running = false
			button.show()
			break
		if enemies[i].y > SIZE.y + 20.0:
			enemies.remove_at(i)
	update_hud()
	queue_redraw()

func update_hud() -> void:
	hud.text = "存活 %.1f 秒  |  方向键 / 触摸移动" % elapsed
	if not running and elapsed > 0.0:
		hud.text = "本局 %.1f 秒 · 碰到了！再试一次" % elapsed

func _draw() -> void:
	for x in range(0, 640, 40):
		draw_line(Vector2(x, 70), Vector2(x, 720), Color(0.10, 0.15, 0.22))
	draw_circle(player, PLAYER_RADIUS, Color(0.36, 0.94, 0.77))
	for enemy in enemies:
		draw_circle(enemy, 15.0, Color(1.0, 0.43, 0.39))

```

## 05 · 移动为什么要乘delta

速度360的单位是像素/秒。每帧移动量等于速度乘本帧秒数；如果直接每帧加360，移动速度会随着帧率变化。Input.get_axis使用Godot预设的ui_left与ui_right，下载工程无需自定义输入动作。
clampf把x限制在[18,622]，使圆形角色不越界。触摸路径用move_toward逐步靠近手指，而不是瞬移。先只验收左右移动和边界，再考虑加入加速度。
代码将过大的delta限制到0.05秒，避免从后台回到窗口时跳过大量碰撞。本局时间按实际模拟步进累计，刻意不当作严格墙上时钟。

## 06 · 敌人生成、清理与碰撞怎么串起来

每帧减少spawn_left，归零就往数组加入一个位置。初始间隔0.65秒，随着存活时间逐渐缩短，最小0.18秒；下落速度也缓慢增加。
遍历数组时从最后一个元素往前走，因为remove_at会让后面的元素前移。正向删除容易漏处理邻近元素。敌人离开窗口后从数组删除，防止一局越玩数据越多。
碰撞后先把running设为false，再显示按钮并退出本次敌人循环。下一帧_process一开始直接return，所有敌人停止移动，不会出现失败后仍继续计时的问题。

## 07 · 为什么重开不用重新加载整个项目

start_game集中重置玩家坐标、敌人数组、计时器和触摸目标，再隐藏按钮。按钮的pressed信号只在_ready连接一次，所以每局不会多注册一个回调。
测试方法：故意撞到敌人后连续重开5次，观察第一颗敌人的出现时间与玩家速度是否一致。若重开越来越快，优先检查是否重复创建Timer、连接信号或保留了上局状态。

## 08 · 用AI做一次有验收标准的改动

不要让AI“把游戏优化一下”。先提交main.gd和实际版本，只要求增加一个机制，例如3点生命值。可以复制下面的任务；修改前保留原文件，完成后对照每项验收。
如果AI生成的代码报错，把第一条错误、行号和相关函数发回去，不要只说“不能用”。本练习不需要发送API密钥或其他项目文件。

```text
项目是Godot 4.7.2，main.gd如下【粘贴】。请增加3点生命值和受击后1秒无敌：保持现有输入与坐标体系；同一帧撞到多颗敌人只扣1点；剩余生命为0才结束；重开恢复3点生命。请先列修改位置，再给代码和5条可操作验收步骤。不要引入插件。
```

## 09 · 验收、排错与导出

验收：①未开始前不计时；②左右移动不越界；③红点从上方进入；④碰撞后时间冻结；⑤重开清空敌人并归零；⑥离屏敌人不再保留。下载包test.gd自动检查碰撞、重开和离屏清理，不能代替视觉和真机测试。
看不到按钮：检查main.gd是否挂在Main节点；无法左右移动：先点击运行窗口获取焦点，确认没有改动ui_left/ui_right；只出现空场景：确认F5所选主场景。
导出桌面程序时先通过编辑器安装匹配版本的导出模板，再在项目→导出选择目标系统。本文没有附导出二进制，也没有声称完成Android/iOS真机适配。

```bash
godot --headless --path ./godot-dodge --script test.gd
```

## 参考资料

- Godot官方中文：你的第一个2D游戏（4.3） https://docs.godotengine.org/zh-cn/4.3/getting_started/first_2d_game/
- Godot官方中文：Node2D https://docs.godotengine.org/zh-cn/4.3/classes/class_node2d.html

本站原创示例代码使用MIT许可；第三方引擎保留各自许可。
