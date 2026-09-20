extends SceneTree
func _initialize() -> void:
	var game = load("res://main.tscn").instantiate()
	root.add_child.call_deferred(game)
	call_deferred("check", game)
func check(game: Node2D) -> void:
	game.set_process(false)
	game.start_game()
	assert(game.running and game.elapsed == 0)
	game.spawn_left = 100
	game.enemies = [game.player - Vector2(0, 1)] as Array[Vector2]
	game._process(0.01)
	assert(not game.running)
	game.start_game()
	assert(game.enemies.is_empty() and game.running)
	game.spawn_left = 100
	game.enemies.append(Vector2(20, 780))
	game._process(0.01)
	assert(game.enemies.is_empty())
	print("PASS: collision, restart, offscreen cleanup")
	quit()
