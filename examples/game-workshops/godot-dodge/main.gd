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
