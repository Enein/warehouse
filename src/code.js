// объявление массива роботов
var robot = new Array();
var robots = 0;
// объявление массива стеллажей
var box = new Array();
var boxes = 0;
var loadz = 0;
// объявление массива грузов
var load = new Array();
var loads = 0;

function RENDER(){
	var W = $("#main").width();
	var H = $("#main").height();
	var stage = new PIXI.Stage(0xFFFFFF);
	var renderer = PIXI.autoDetectRenderer( W, H );
	$("#render").append(renderer.view);
	requestAnimFrame( animate );

	// фон (подложка)
	var demo = ""; // 0
	var tile = PIXI.Texture.fromImage("src/im/tile" + demo + ".png");
	var tilingSprite = new PIXI.TilingSprite(tile, W, H);
	stage.addChild(tilingSprite);
	if (demo)
		$("body").css("background", "#fff");

	var graphics = new PIXI.Graphics();
	stage.addChild(graphics);

	var RGB = [0xff2828, 0xffff21, 0xca3aff, 0x00d8ff, 0xff7200]; // цветовые схемы рядов
	var RGBh = ["#ff2828", "#ffff21", "#ca3aff", "#00d8ff", "#ff7200"];
	var DIR = ["СВОБОДЕН", "ПРИНЯТИЕ", "ЗАГРУЖЕН", "ОТПУСК"];

/* ERASE *
		$("#db").fadeIn(500);
		$("#ui").fadeIn(500);
		$("#alg").val(0);
		CELLS = Math.floor(2+Math.random()*32) * 2;
		ROWS = Math.floor(1+Math.random()*5);
		ROBOTS = Math.floor(1+Math.random()*5);
		if (ROBOTS > ROWS) ROBOTS = ROWS;
/* ERASE */

	var STEP = 28;
	var LOADS = 0;
	var Xy = 0;
	var xY = 0;

	var X0 = W/2 - 0.25 * CELLS * STEP + 80; // базовое значение x
	var Y0 = H/2 + ROWS * STEP - 0; // базовое значение y

	var xS = X0 - STEP * 8; // (x, 0)
	var yS = Y0 + STEP * 3.5; // (0, y)

	var xL = 8 + CELLS/2 + 8; // максимум по x
	var yL = 6 + ROWS * 3 + 6; // максимум по y

	var INPUT_X = 0;
	var INPUT_Y = 0;
	var OUTPUT_X = 0;
	var OUTPUT_Y = 0;

	var AX = new Array(xL);   // реальное значение x (в pxl) ячейки сетки
	var AY = new Array(xL);   // реальное значение y (в pxl) ячейки сетки
	var AS = new Array(xL);   // статус ячейки
	var AR = new Array(ROWS); // статус ряда буферной зоны

	for (var i = 0; i < xL; i++) {
		AX[i] = new Array(yL);
		AY[i] = new Array(yL);
		AS[i] = new Array(yL);
	}

	var LINE = [];
	for (var i = 0; i < ROBOTS; i++) {
		LINE[i] = new PIXI.Graphics();
		stage.addChild(LINE[i]);
	}

	// объявление массива поворотных платформ
	var crossArr = [];
	var crossTotal = 0;

	var rH = PIXI.Texture.fromImage("src/im/railH" + demo + ".png");
	var rV = PIXI.Texture.fromImage("src/im/railV" + demo + ".png");
	var rX = PIXI.Texture.fromImage("src/im/railX" + demo + ".png");
	var Box = PIXI.Texture.fromImage("src/im/box" /*+ demo*/ + ".png");
	var Bot = PIXI.Texture.fromImage("src/im/bot.png");
	var Crate = PIXI.Texture.fromImage("src/im/load" + demo + ".png");
	var Buffer = PIXI.Texture.fromImage("src/im/buffer" + demo + ".png");
	var TEMP = 0;
	var ALG = 0;
	var LAST = 0;

	/* присвоение статуса ячейки координатной сетки модели:
	    0 - пусто,
		1 - стеллаж,
		2 - рельсы (путь),
		3 - поворотная платформа.
	*/
	function setStateByCoords(cx, cy, st) {
		cx += STEP/2;
		cy += STEP/2;
		for (var i = 0; i < (xL); i++) {
			for (var j = 0; j < (yL); j++) {
				if (Math.sqrt(Math.pow(AX[i][j] - cx, 2) + Math.pow(AY[i][j] - cy, 2)) <= 8) {
					AS[i][j] = st;
					Xy = i;
					xY = j;
					i = xL;
					j = yL;
				}
			}
		}
	}

	// поиск пустого ряда
	function freeRow(cy) {
		var Y = cy;
		for (var y = 0; y < (ROWS); y++) {
			var busy = false;
			for (var i = 0; i < (CELLS/2); i++) {
				if (!grid.isWalkableAt(8 + i, 3 + 4 * y))
					busy = true;
			}
			if (!busy) {
				Y = 3 + 4 * y;
				y = ROWS;
			}
		}
		return Y;
	}

	// поиск ближайшего к заданным координатам робота
	function nearestRobot(x, y) {
		var I = -1;
		var Z = 9999;
		var A = 0;
		var T = 0;
		var O = 0;
		for (var o = 0; o < (ROBOTS); o++) {
			if (!robot[o].busy) {
				var temp_grid = near_grid.clone();
				var finder = selFinder(ALG);
				OPS = 0;
				var timeStart = window.performance ? performance.now() : Date.now();
				var path = finder.findPath(robot[o].X, robot[o].Y, x, y, temp_grid);
				var timeEnd = window.performance ? performance.now() : Date.now();
				var timeSpent = (timeEnd - timeStart) + Math.random() * 0.01 + 0.01488 * OPS;
				A = Math.floor(PF.Util.pathLength(path) + 0.5);

				if (A < Z && (A > 0 || (robot[o].X == x && robot[o].Y == y))) {
					Z = A;
					I = o;
					T = timeSpent;
					O = OPS;
				}
				delete path;
				delete temp_grid;
			}
		}
		if (I >= 0) {
			robot[I].atime = T;
			robot[I].aops = O;
		}
		return I;
	}

	// поиск ближайшего к заданным координатам стеллажа
	function nearestBox(x, y, near, loru) {
		var I = -1;
		var Z = 9999;
		var A = 0;
		var T = 0;
		var O = 0;
		if (near && !loru)
			Z = 0;
		for (var o = 0; o < (boxes); o++) {
			if (box[o].status == 0 && loru || box[o].status == 2 && !loru) {
				var temp_grid = near_grid.clone();
				var finder = selFinder(ALG);
				var timeStart = window.performance ? performance.now() : Date.now();
				OPS = 0;
				if (near) {
					var path = finder.findPath(x, y, box[o].X, box[o].Y + box[o].j, temp_grid);
				} else {
					var path = finder.findPath(OUTPUT_X, OUTPUT_Y, box[o].X, box[o].Y + box[o].j, temp_grid);
				}
				var timeEnd = window.performance ? performance.now() : Date.now();
				var timeSpent = (timeEnd - timeStart) + Math.random() * .01 + .01488 * OPS;
				A = Math.floor(PF.Util.pathLength(path) + .5);
				if ((A < Z && (A > 0 || (box[o].X == x && box[o].Y + box[o].j == y)) && (loru || (!near && !loru))) || (A > Z && near && !loru)) {
					Z = A;
					I = o;
					T = timeSpent;
					O = OPS;
				}
				delete path;
				delete temp_grid;
			}
		}
		if (I >= 0) {
			STAT_altime += T;
			STAT_alops += O;
			Console("Поиск ближайшего | Время поиска: " + T.toFixed(3) + " ms. Операций: " + O);
		}
		return I;
	}

	function targetBox(x, y, o, loru) {
		var I = -1;
		var T = 0;
		var O = 0;
		
		var temp_grid = near_grid.clone();
		var finder = selFinder(ALG);
		var timeStart = window.performance ? performance.now() : Date.now();
		OPS = 0;
		var path = finder.findPath(x, y, box[o].X, box[o].Y + box[o].j, temp_grid);
		var timeEnd = window.performance ? performance.now() : Date.now();
		var timeSpent = (timeEnd - timeStart) + Math.random() * .01 + .01488 * OPS;

		I = o;
		T = timeSpent;
		O = OPS;

		delete path;
		delete temp_grid;
		if (I >= 0) {
			STAT_altime += T;
			STAT_alops += O;
			Console("Поиск ближайшего | Время поиска: " + T.toFixed(3) + " ms. Операций: " + O);
		}
		return I;
	}

	for (var i = 0; i < (xL); i++) {
		for (var j = 0; j < (yL); j++) {
			AX[i][j] = xS + STEP * i + STEP/2;
			AY[i][j] = yS - STEP * j + STEP/2;
			AS[i][j] = 0;
		}
	}

	// функция отрисовки координатной сетки
	function customGrid(x, y) {
		graphics.lineStyle(2, 0x777777, 0.2);

		// границы плоскости
		graphics.moveTo(xS + STEP, yS);
		graphics.lineTo(xS + STEP, yS - (y) * STEP);
		graphics.moveTo(xS + STEP, yS - (y) * STEP);
		graphics.lineTo(xS + (x) * STEP, yS - (y) * STEP);
		graphics.moveTo(xS + (x) * STEP, yS - (y) * STEP);
		graphics.lineTo(xS + (x) * STEP, yS);
		graphics.moveTo(xS + (x) * STEP, yS);
		graphics.lineTo(xS + STEP, yS);

		var txt = new PIXI.Text(" буферная зона\n(прием изделий)", { font: "8pt verdana", fill: "orange" });
		txt.position.y = yS - 1.5 * STEP;
		txt.position.x = xS + 2 * STEP;
		stage.addChild(txt);
		txt = new PIXI.Text(" отпуск\nизделий", { font: "8pt verdana", fill: "orange" });
		txt.position.y = yS - 1.75 * STEP;
		txt.position.x = xS + (x - 2) * STEP;
		stage.addChild(txt);
		txt = new PIXI.Text("стеллажи", { font: "8pt verdana", fill: "orange" });
		txt.position.y = yS - (y - 0.25) * STEP;
		txt.position.x = xS + (x/2 + 1) * STEP;
		stage.addChild(txt);

		// отрисовка по оси Y
		for (var i = 0; i <= (y); i++) {
			var coord = new PIXI.Text(i, { font: "8pt verdana", fill: "brown" });
			graphics.moveTo(xS, yS - i * STEP);
			graphics.lineTo(xS + STEP, yS - i * STEP);
			coord.position.y = yS - (i - 0.25) * STEP;
			coord.position.x = xS + 0.25 * STEP;
			stage.addChild(coord);
		}

		// отрисовка по оси X
		for (var i = 0; i < (x); i++) {
			var coord = new PIXI.Text(i, { font: "8pt verdana", fill: "brown" });
			graphics.moveTo(xS + (i + 1) * STEP, yS);
			graphics.lineTo(xS + (i + 1) * STEP, yS + STEP);
			coord.position.y = yS + 0.25 * STEP;
			coord.position.x = xS + (0.25 + i) * STEP;
			stage.addChild(coord);
		}

		INPUT_X = 2;
		INPUT_Y = 3;
		OUTPUT_X = x - 2;
		OUTPUT_Y = 3;
	}

	// создание нового робота
	function addRobot(row) {
		robot[robots] = new PIXI.Sprite(Bot);
		robot[robots].anchor.x = 0.5;  // относительная точка отсчета для объекта по оси X
		robot[robots].anchor.y = 0.5;  // относительная точка отсчета для объекта по оси Y
		robot[robots].x = crossArr[row * 2].x + Math.floor(CELLS/4) * STEP;
		robot[robots].y = crossArr[row * 2].y;
		robot[robots].curWay = 0;      // количество _уже_ произведенных шагов
		robot[robots].limWay = 0;      // количество шагов пути к намеченной точке
		robot[robots].number = robots; // порядковый номер робота
		robot[robots].loaded = false;  // имеется ли у робота груз в данный момент времени
		robot[robots].space = false;   // находится ли робот на поворотной платформе в данный момент времени
		robot[robots].spaceRun = false;
		robot[robots].busy = false;    // занятость робота каким-либо процессом
		robot[robots].toBOX = false;
		robot[robots].toOUT = false;
		robot[robots].toHOM = false;
		robot[robots].boxI = -1;
		robot[robots].tick = 0;        // задержка исполнения операции
		robot[robots].TY = -1;          // целевой ряд (назначения загрузки)

		robot[robots].time = 0;        // время работы робота
		robot[robots].loads = 0;       // обслужено грузов за смену
		robot[robots].dir = 4;         // текущее направление движения робота
		robot[robots].loadID = 0;      // ID груза, находящегося у данного робота
		robot[robots].task = "";       // текущее задание (для БД)
		robot[robots].atime = 0;
		robot[robots].aops = 0;

		robot[robots].a0 = 0;          // угол направления роботая
		robot[robots].a1 = 0;          // вспомогательные переменные
		robot[robots].a2 = 1;          //     при вращении робота на
		robot[robots].a3 = 0;          //       поворотной платформе

		robot[robots].scale.x = robot[robots].scale.y = STEP/28;
		robot[robots].isOver = false;
		robot[robots].tint = RGB[robots];
		robot[robots].wayColor = RGB[robots];
		robot[robots].RGB = RGB[robots];

		for (var i = 0; i < (xL); i++) {
			for (var j = 0; j < (yL); j++) {
				if (Math.sqrt(Math.pow(AX[i][j] - robot[robots].x, 2) + Math.pow(AY[i][j] - robot[robots].y, 2)) <= 8) {
					robot[robots].X = i;
					robot[robots].Y = j;
					grid.setWalkableAt(i, j, false);
					i = xL;
					j = yL;
				}
			}
		}
		robot[robots].baseX = robot[robots].X;
		robot[robots].baseY = robot[robots].Y;

		robot[robots].interactive = true;
		robot[robots].buttonMode = true;

		robot[robots].mouseout = function(data) {
			this.isOver = false;
			this.alpha = 1;
			$("#sInfo").css("left", "9999px");
		};
		robot[robots].mouseover = function(data) {
			if (!this.isOver){
				var s = "T0";
				var t = "" + this.name;
				var d = 0;
				this.alpha = 0.9;

				// текущая задача
				$("#sInfo > .info_id").text("Робот ID: " + s.slice(0, -t.length) + t);
				$("#sInfo > .info_xy").text("(" + this.X + ", " + this.Y + ")");
				$("#sInfo .info_task span").text(this.task);
				$("#sInfo .info_loads span").text(this.loads);
				if (this.Y < 4 && ROWS > 2) { xY = this.y - 145 - STEP * 0.75 } else { xY = this.y + STEP/2 }
				if (this.X > 36) { Xy = this.x - 216 + STEP * 0.25 } else { Xy = this.x - STEP/2 }
				$("#sInfo").css({ "top": xY + "px", "left": Xy + "px" });
				$("#sInfo").show();
			}
		};

		stage.addChild(robot[robots]);
		robots++;

		// добавление информации о роботе в базу данных
		var s = "T00";
		var t = "" + robots;
		$("#rList tr:last-child").before("<tr><td>" + s.slice(0, -t.length) + t + "</td><td>192.168.1." + robots + "</td><td id=r_state" + (robots - 1) + ">СВОБОДЕН :: — : —</td><td id=r_coord" + (robots - 1) + ">[ " + robot[robots - 1].X + " : " + robot[robots - 1].Y + " ]</td><td id=r_loads" + (robots - 1) + ">0</td><td id=r_time" + (robots - 1) + ">0s</td></tr>");
		robot[robots - 1].name = (s.slice(0, -t.length) + t);
	}

	function roRun(way, a) {
		var TI = setTimeout(function() {
			if (!robot[a].space) {
				robot[a].curWay++;
				var cur = robot[a].curWay;
				if (cur >= robot[a].limWay) {
					robot[a].x = AX[way[cur - 1][0]][way[cur - 1][1]];
					robot[a].y = AY[way[cur - 1][0]][way[cur - 1][1]];

					TEMP = 4000;
					if (robot[a].dir != 4) {
						var ti = setInterval(roAnim, 800/SPEED);
						function roAnim() {
							if (robot[a].tint == robot[a].RGB) {
								robot[a].tint = 0xffffff;
							} else {
								robot[a].tint = robot[a].RGB;
							}
						}
						if (robot[a].dir == 2 && loadz == 1) {
							LU_Enable(0);
						}
					} else
						TEMP = 400;
					setTimeout(function() {
						clearInterval(ti);
						robot[a].tint = robot[a].RGB;
						robot[a].setTexture(Bot);
						if (robot[a].target && robot[a].dir > 0) {
							if (robot[a].target.status == 1) {
								robot[a].target.tint = RGB[robot[a].target.row];
								robot[a].target.status = 2;
								robot[a].target.task = DIR[2];
								robot[a].target.bot = -1;
								robot[a].target.tag = robot[a].tag;
								$("#s_state" + (robot[a].target.id - 1)).text("ЗАГРУЖЕН :: #" + robot[a].loadID + " : —");

								$("#outTask").append('<option value="' + robot[a].target.id + '">' + robot[a].tag + '</option>');
							} else if (robot[a].target.status == 2) {
								robot[a].target.status = 3;
								robot[a].target.task = DIR[3];
							} else if (robot[a].target.status == 3) {
								robot[a].target.alpha = 1;
								robot[a].target.tint = 0x50ff37;
								robot[a].target.task = DIR[0];
								robot[a].target.status = 0;
								robot[a].target.bot = -1;
								robot[a].target.loadID = 0;
								$("#s_state" + (robot[a].target.id - 1)).text("СВОБОДЕН :: — : —");
							}
							$("#s_id" + (robot[a].target.id - 1)).css("background", "black");
						}
						robot[a].limWay = 0;
						if (robot[a].dir == 0) {
							AR[robot[a].target.row] = false;
							robot[a].target.status = 2;
							robot[a].setTexture(Crate);
							robot[a].loaded = true;
							stage.removeChild(robot[a].target);
						} else if (robot[a].dir == 2) {
							robot[a].setTexture(Crate);
							robot[a].target = undefined;
							robot[a].toOUT = true;
						} else if (robot[a].dir == 3) {
							robot[a].loadID = 0;
							robot[a].toHOM = true;
							if (TASK && inTask.length < 1 && outTask.length < 1 && loadz == 0) {
								$(".c4 div").fadeIn(800);
								TASK = false;
							}
						} else {
							robot[a].busy = false;
							robot[a].loaded = false;
							robot[a].target = undefined;
							robot[a].loadID = 0;
							robot[a].dir = 4;
						}
						delete way;
						LINE[a].clear();
						clearTimeout(TI);
					}, TEMP/SPEED);
				} else {
					if (cur == 1 && robot[a].dir == 1)
						loads--;
					Xy = way[cur][0];
					xY = way[cur][1];

					LINE[a].moveTo(robot[a].x, robot[a].y);
					LINE[a].lineTo(AX[Xy][xY], AY[Xy][xY]);

					robot[a].x = AX[Xy][xY];
					robot[a].y = AY[Xy][xY];

					if (AS[Xy][xY] == 3) {
						var an = Math.atan2(AY[way[cur + 1][0]][way[cur + 1][1]] - robot[a].y, AX[way[cur + 1][0]][way[cur + 1][1]] - robot[a].x);
						if (way[cur][0] - robot[a].X > 0)
							robot[a].curAng = 0;
						if (robot[a].curAng != an) {
							robot[a].space = true;
						}
						robot[a].curAng = an;
					}

					roRun(way, a);
					grid.setWalkableAt(robot[a].X, robot[a].Y, true);
				}
				if (cur < robot[a].limWay) {
					robot[a].X = way[cur][0];
					robot[a].Y = way[cur][1];
				}
			} else {
				roRun(way, a);
			}
		}, 1000/SPEED);
	}

	function roFind(a, x, y, target, dir) {
		var temp_grid = grid.clone();
		var finder = selFinder(ALG);

		OPS = 0;
		var timeStart = window.performance ? performance.now() : Date.now();
		var path = finder.findPath(robot[a].X, robot[a].Y, x, y, temp_grid);
		var timeEnd = window.performance ? performance.now() : Date.now();
		var timeSpent = (timeEnd - timeStart) + Math.random() * 0.01 + 0.01488 * OPS;

		var len = Math.sqrt(Math.pow(robot[a].X - x, 2) + Math.pow(robot[a].Y - y, 2));
		if (!(path.length < 1 && len >= 1 )) {
			STAT_altime += timeSpent;
			STAT_alops += OPS;

			var samePos = (path.length < 1 || (robot[a].X - path[path.length - 1][0] == 0 && robot[a].Y - path[path.length - 1][1] == 0));
			if (!samePos) {
				// "сглаживание" JPS на поворотах
				if ($("#alg").val() == 4 && path.length > 1) {
					for (var f = 0; f < (path.length - 1); f++) {
						if (Math.abs(path[f][0] - path[f + 1][0]) * Math.abs(path[f][1] - path[f + 1][1]) == 1) {
							dx = (path[f + 1][0] - path[f][0]);
							dy = (path[f + 1][1] - path[f][1]);
							if (dx > 0 && dy > 0) {
								if (AS[path[f][0]][path[f + 1][1]] == 3) {
									xx = path[f][0]; yy = path[f + 1][1];
								} else {
									xx = path[f + 1][0]; yy = path[f][1];
								}	
							} else if ((dx > 0 && dy < 0) || (dx < 0 && dy > 0) || (dx < 0 && dy < 0)) {
								if (AS[path[f + 1][0]][path[f][1]] == 3) {
									xx = path[f + 1][0]; yy = path[f][1];
								} else {
									xx = path[f][0]; yy = path[f + 1][1];
								}	
							}
							path.splice(f + 1, 0, [xx, yy]);
						}
					}
				}

				LINE[a].lineStyle(STEP/2, robot[a].wayColor, 0.9);
				LINE[a].moveTo(xS + robot[a].X * STEP + STEP/2, yS - robot[a].Y * STEP + STEP/2);
				for (var f = 0; f < (path.length); f++) {
					LINE[a].lineTo(xS + path[f][0] * STEP + STEP/2, yS - path[f][1] * STEP + STEP/2);
					grid.setWalkableAt(path[f][0], path[f][1], false);
				}
			} else if (path.length < 1)
				path.push([robot[a].X, robot[a].Y]);

			if (target) {
				if (dir < 1) {
					target.tint = RGB[a];
					robot[a].loadID = target.id;
					target.status = 2;
				} else {
					var s = "";
					if (target.status < 2) {
						target.status = 1;
						target.tint = 0xffffff;
						target.loads++;
						target.task = DIR[1];
						target.bot = a;
						s = "ПРИНЯТИЕ :: #" + robot[a].loadID + " : " + robot[target.bot].name;
					} else if (target.status == 2) {
						target.status = 3;
						target.tint = 0xbbbbbb;
						target.task = DIR[3];
						target.bot = a;
						s = "ОТПУСК :: #" + target.loadID + " : " + robot[target.bot].name;
					}

					$("#s_loads" + (target.id - 1)).text(target.loads);
					$("#s_state" + (target.id - 1)).text(s);
					$("#s_id" + (target.id - 1)).css("background", RGBh[a]);
				}
				if (dir == 1 || dir == 2) {
					robot[a].loads++;
					if (dir == 2) 
						robot[a].loadID = target.loadID;
				}
				robot[a].target = target;
				if (dir < 2)
					robot[a].target.loadID = robot[a].loadID;
			}

			if (robot[a].atime > 0) {
				STAT_altime += robot[a].atime;
				STAT_alops += robot[a].aops;
				Console("Поиск пути (" + $("#alg :selected" ).text() + "): Время поиска: " + robot[a].atime.toFixed(3) + " ms. Операций: " + robot[a].aops);
			}

			robot[a].toBOX = false;
			robot[a].toOUT = false;
			robot[a].toHOM = false;
			robot[a].block = false;
			robot[a].tick = 0;
			robot[a].boxI = robot[a].TY = -1;
			robot[a].curWay = 0;
			robot[a].limWay = path.length;
			if (samePos)
				robot[a].limWay = 0;

			LINE[a].lineStyle(STEP/2, 0x2a2a2a, 0.7);

			robot[a].dir = dir;
			robot[a].busy = true;
			robot[a].curAng = Math.PI;
			roRun(path, a);

			Console("Поиск пути (" + $("#alg :selected" ).text() + ") | Время поиска: " + timeSpent.toFixed(3) + " ms. Длина пути: " + Math.floor(PF.Util.pathLength(path) + 0.5) + " ед. Операций: " + OPS);
		}
		delete path;
		delete temp_grid;
	}

	// запуск поиска пути согласно выбранного алгоритма
	function selFinder(id) {
		if (id == 0)
			return new PF.AStarFinder();
		if (id == 1)
			return new PF.BreadthFirstFinder();
		if (id == 2)
			return new PF.BestFirstFinder();
		if (id == 3)
			return new PF.DijkstraFinder();
		if (id == 4)
			return new PF.JumpPointFinder();
	}

	// создание нового стеллажа
	function addBox(x, y, j, r) {
		box[boxes] = new PIXI.Sprite(Box);
		box[boxes].scale.x = box[boxes].scale.y = STEP/28;
		box[boxes].id = (boxes + 1);   // идентификатор стеллажа
		box[boxes].x = x;
		box[boxes].y = y;
		box[boxes].j = j;
		box[boxes].row = r;
		box[boxes].bot = -1;
		box[boxes].status = 0;         // 0 - СВОБОДЕН, 1 - ПРИНЯТИЕ, 2 - ЗАГРУЖЕН, 3 - ОТПУСК
		box[boxes].loads = 0;          // количество обслуженных грузов
		box[boxes].loadID = 0;         // ID груза, находящегося на данном стеллаже
		box[boxes].task = "СВОБОДЕН";  // СВОБОДЕН/ПРИНЯТИЕ/ЗАГРУЖЕН/ОТПУСК :: НОМЕР_ГРУЗА : ID_РОБОТА
		box[boxes].tint = 0x50ff37;    // 50ff37 - СВОБОДЕН,  ffffff - ПРИНЯТИЕ, RGB[row] - ЗАГРУЖЕН, bbbbbb - ОТПУСК

		x += STEP/2;
		y += STEP/2;
		for (var i = 0; i < (xL); i++) {
			for (var n = 0; n < (yL); n++) {
				if (Math.sqrt(Math.pow(AX[i][n] - x, 2) + Math.pow(AY[i][n] - y, 2)) <= 8) {
					box[boxes].X = i;
					box[boxes].Y = n;
					i = xL;
					n = yL;
				}
			}
		}

		box[boxes].interactive = true;
		box[boxes].buttonMode = true;
		box[boxes].mousedown = box[boxes].touchstart = function(data) {
			data.originalEvent.preventDefault();
			if (this.status == 2 && U_manual) {
				var I = nearestRobot(this.X, this.Y + this.j);
				if (I >= 0) {
					L_manual = false;
					U_manual = false;
					LU_Enable(-1);
					roFind(I, this.X, this.Y + this.j, this, 2);
				}
			}
			if (this.status == 0 && L_manual) {
				var I = nearestRobot(load[LAST].X, load[LAST].Y);
				if (I >= 0) {
					load[LAST].TI = this.id;
					L_manual = false;
					U_manual = false;
					LU_Enable(1);
					roFind(I, load[LAST].X, load[LAST].Y, load[LAST], 0);
				}
			}
		};

		box[boxes].mouseout = function(data) {
			this.isOver = false;
			this.alpha = 1;
			$("#sInfo").css("left", "9999px");
		};
		box[boxes].mouseover = function(data) {
			if (!this.isOver){
				var s = "S000";
				var t = "" + this.id;
				this.alpha = 0.8;

				// текущая задача
				$("#sInfo > .info_id").text("Стеллаж ID: " + s.slice(0, -t.length) + t);
				$("#sInfo > .info_xy").text("(" + this.X + ", " + this.Y + ")");
				if (this.bot >= 0) {
					var s = robot[this.bot].name;
				} else
					var s = "—";
				var t = "#" + this.loadID;
				if (this.status == 0)
					t = "—";
				$("#sInfo .info_task span").text(this.task + " :: " + t + " : " + s);
				$("#sInfo .info_loads span").text(this.loads);
				if (this.row == 0 && ROWS > 2) { xY = this.y - 145 - STEP * 0.25 } else { xY = this.y + STEP }
				if (this.X > 36) { Xy = this.x - 216 + STEP * 0.75 } else { Xy = this.x }
				$("#sInfo").css({ "top": xY + "px", "left": Xy + "px" });
				$("#sInfo").show();
			}
		};

		stage.addChild(box[boxes]);
		setStateByCoords(x, y, 1);

		boxes++;

		// добавление информации о стеллаже в базу данных
		var s = "S000";
		var t = "" + boxes;
		$("#sDB").append("<tr><td id=s_id" + (boxes - 1) + ">" + s.slice(0, -t.length) + t + "</td><td id=s_state" + (boxes - 1) + ">СВОБОДЕН :: — : —</td><td>[ " + box[boxes - 1].X + " : " + box[boxes - 1].Y + " ]</td><td id=s_loads" + (boxes - 1) + ">0</td></tr>");
		box[boxes - 1].name = (s.slice(0, -t.length) + t);
	}

	// генерация системы путей
	for (var r = 0; r < (ROWS); r++) {
		for (var i = 0; i < (CELLS/2); i++) {
			temp_x = X0 + STEP * i;
			temp_y = Y0 - r * STEP * 4;

			addBox(temp_x, temp_y + STEP * 1.5,  1, r);
			addBox(temp_x, temp_y - STEP * 0.5, -1, r);

			var rail = new PIXI.Sprite(rH);
			rail.x = temp_x;
			rail.y = temp_y + STEP * 0.5;
			rail.scale.x = rail.scale.y = STEP/28;
			stage.addChild(rail);
			setStateByCoords(rail.x, rail.y, 2);
		}

		for (var s = 0; s <= 1; s++) {
			var rail = new PIXI.Sprite(rX);
			rail.x = X0 + STEP * (-1 + s * (CELLS/2 + 1) + 0.5);
			rail.y = Y0 - STEP * (4 * r - 1);
			rail.anchor.x = 0.5;
			rail.anchor.y = 0.5;
			rail.scale.x = rail.scale.y = STEP/28;

			crossArr.push(rail);
			stage.addChild(rail);
			setStateByCoords(rail.x - STEP/2, rail.y - STEP/2, 3);

			if (r == 0) {
				if (ROWS < 2) {
					rail.setTexture(rH)
				} else
					rail.rotation += 90 * Math.PI/180;
			}
			if (r + 1 >= ROWS) {
				var over = 0;
				var i = 0;
				if (ROWS == 1) over = -1;
				while (over + 1 < ROWS) {
					if (over > - 1) {
						i++;
						if (i % 4 == 0) {
							i++;
							over++;
						}
					} else {
						over = ROWS;
						i++;
					}
					if (over + 1 < ROWS) {
						var railV = new PIXI.Sprite(rV);
						railV.x = rail.x - STEP/2;
						railV.y = rail.y - STEP * (0.5 - i);
						railV.scale.x = railV.scale.y = STEP/28;
						stage.addChild(railV);
						setStateByCoords(railV.x, railV.y, 2);
					} else {
						for (var z = 0; z <= 4; z++) {
							var railH = new PIXI.Sprite(rH);
							if (z != 3 || ROWS == 1) {
								if (s < 1) {
									railH.x = rail.x - (1.5 + z) * STEP;
									railH.y = rail.y - STEP * (1.5 - i);
								} else if (z < 2) {
									railH.x = rail.x + (0.5 + z) * STEP;
									railH.y = rail.y - STEP * (1.5 - i);
								}
								railH.scale.x = railH.scale.y = STEP/28;
								if (s < 1 || z < 2) {
									stage.addChild(railH);
									setStateByCoords(railH.x, railH.y, 2);
								}
							}
						}
					}
				}
			}
		}
		AR[r] = false;
	}
	if (ROWS > 1) {
		for (var i = 0; i < ROWS; i++) {
			var rail = new PIXI.Sprite(rX);
			rail.x = xS + (4 - 0.5) * STEP;
			rail.y = yS - (3 - 0.5 + 4 * i) * STEP;
			rail.anchor.x = 0.5;
			rail.anchor.y = 0.5;
			rail.scale.x = rail.scale.y = STEP/28;
			stage.addChild(rail);
			setStateByCoords(rail.x - STEP/2, rail.y - STEP/2, 3);
			rail.rotation += 90 * Math.PI/180;
			crossArr.push(rail);
			if (i + 1 < ROWS) {
				for (var j = 0; j < 3; j++) {
					var railV = new PIXI.Sprite(rV);
					railV.x = rail.x - STEP/2;
					railV.y = rail.y - STEP * (1.5 + j);
					railV.scale.x = railV.scale.y = STEP/28;
					stage.addChild(railV);
					setStateByCoords(railV.x, railV.y, 2);
				}
			}
			if (i > 0) {
				for (var j = -2; j < 3; j++) {
					if (j != -1) {
						if (i + 1 == ROWS || j < - 1) {
							var railH = new PIXI.Sprite(rH);
							railH.x = rail.x + STEP * (0.5 + j);
							railH.y = rail.y - STEP/2;
							railH.scale.x = railH.scale.y = STEP/28;
							stage.addChild(railH);
							setStateByCoords(railH.x, railH.y, 2);
						}
					}
				}
			}
		}
	}

	// инициализация поля поиска пути
	var grid = new PF.Grid(xL, yL);
	for (var p = 0; p < (xL); p++) {
		for (var q = 0; q < (yL); q++) {
			if (AS[p][q] < 2)
				// объявление координат непроходимых ячеек
				grid.setWalkableAt(p, q, false);
		}
	}
	var near_grid = grid.clone();

	// цикл создания роботов
	for (var r = 0; r < (ROBOTS); r++) {
		addRobot(r);
	}

	// отрисовка координатной сетки
	customGrid(xL - 4, box[boxes - 1].Y + 1);
	$("#sList").height($("#sList").height() - $("#rList").height());

	function toOut() {
		if (loadz > 0) {
			var a = 0;
			if (!TASK) {
				if ($("#u2").is(":checked"))
					a = 1;
				if ($("#u3").is(":checked"))
					a = 2;
			}
			J = -1;
			if (a == 0) {
				var I = nearestBox(OUTPUT_X, OUTPUT_Y, false, false);
				if (TASK)
					var tmp = 0;
					try {
						tmp = parseInt(outTask[0].split("|").shift(), 10);
					} catch(err) {
						tmp = -1;
					}
					if (tmp >= 0)
						I = tmp;
				if (I >= 0)
					var J = nearestRobot(box[I].X, box[I].Y + box[I].j);
			} else if (a == 1) {
				var I = nearestBox(OUTPUT_X, OUTPUT_Y, true, false);
				if (I >= 0)
					var J = nearestRobot(box[I].X, box[I].Y + box[I].j);
			}
			if (J >= 0) {
				LU_Enable(-1);
				robot[J].toBOX = true;
				robot[J].busy = true;
				robot[J].target = box[I];

				if (TASK)
					outTask.shift();
			}
		}
		if (U_ti || (TASK && outTask.length > 0)) {
			setTimeout(function() { 
				toOut();
			}, 1000/STEP);}
	}

	function toBuffer() {
		if (loads < ROWS && loadz < boxes) {
			LOADS++;
			LU_Enable(1);
			var a = 0;
			if (!TASK) {
				if ($("#l2").is(":checked"))
					a = 1;
				if ($("#l3").is(":checked"))
					a = 2;
			}
			var r = Math.floor(Math.random() * ROWS);
			if (AR[r]) {
				while (AR[r]) {
					r = Math.floor(Math.random() * ROWS);
				}
			}
			AR[r] = true;
			LAST = r;
			load[r] = new PIXI.Sprite(Buffer);
			load[r].scale.x = load[r].scale.y = STEP/20;
			load[r].anchor.x = 0.5;
			load[r].anchor.y = 0.5;
			load[r].x = xS + 1.5 * STEP;
			load[r].y = yS - (2.5 + 4 * r) * STEP;
			load[r].tint = 0xffffff;
			load[r].status = 1;
			load[r].step = 20;
			load[r].X = 2;
			load[r].Y = 3 + 4 * r;
			load[r].TI = 0;
			load[r].row = r;
			load[r].alg = a;
			load[r].id = LOADS;
			load[r].name = "БУФЕР";
			load[r].sid = -1;
			load[r].tag = "";
			if (TASK) {
				var sidi = inTask[0].split("|").shift();
				if (sidi == "last")
					sidi = boxes;
				load[r].sid = parseInt(sidi, 10) - 1;
				load[r].tag = inTask[0].split("|").pop();
				inTask.shift();
			}
			stage.addChild(load[r]);
			loads++;
		}
		if (L_ti || (TASK && inTask.length > 0))
			setTimeout(function() {
				toBuffer();
			}, 1000/STEP);
	}

	// секундомер (main)
	function sec() {
		setTimeout(function() {
			for (var a = 0; a < (ROBOTS); a++) {
				var I = 0;
				if (robot[a].busy) {
					robot[a].time += 0.25;
					STAT_rotime += 0.25;
					$("#r_time" + a).text(Math.floor(robot[a].time) + "s");
					$("#r_coord" + a).text("[ " + robot[a].X + " : " + robot[a].Y + " ]");
					$("#r_loads" + a).text(robot[a].loads);
					if (robot[a].dir == 4)
						s = DIR[0];
					if (robot[a].dir == 0)
						s = DIR[1];
					if (robot[a].dir == 2)
						s = DIR[3];
					if (robot[a].dir == 1 || robot[a].dir == 3)
						s = DIR[2];
					t = "—";
					if (robot[a].loadID > 0)
						t = "#" + robot[a].loadID;
					s += " :: " + t + " : ";
					if (robot[a].dir < 3 && robot[a].target) {
						s += robot[a].target.name;
					} else
						s += "—";
					
					if (robot[a].dir == 0 && robot[a].loaded) {
						if (robot[a].boxI < 0) {
							if (robot[a].target.alg < 2) {
								I = -1;
								if (!TASK) {
									if (robot[a].target.alg == 0)
										I = nearestBox(robot[a].X, robot[a].Y, true, true);
									if (robot[a].target.alg == 1)
										I = nearestBox(robot[a].X, robot[a].Y, false, true);
								} else {
									I = targetBox(robot[a].X, robot[a].Y, robot[a].target.sid, true);
								}
							} else {
								I = robot[a].target.TI - 1;
							}
							if (I >= 0) {
								robot[a].boxI = I;
								robot[a].TY = box[I].Y + box[I].j;
								robot[a].tag = robot[a].target.tag;
								box[I].status = 1;
							}
						}
						if (robot[a].boxI >= 0) {
							robot[a].tick++;
							roFind(a, box[robot[a].boxI].X, box[robot[a].boxI].Y + box[robot[a].boxI].j, box[robot[a].boxI], 1);
							
						}
					}
					if (robot[a].toBOX) {
						robot[a].tick++;
						if (robot[a].target.status > 0 && robot[a].tick < CELLS + 10)
							roFind(a, robot[a].target.X, robot[a].target.Y + robot[a].target.j, robot[a].target, 2);
						else {
							robot[a].toBOX = false;
							robot[a].tick = 0;
							robot[a].busy = false;
							robot[a].target = undefined;
							U_ti = true;
							if (loadz == 0) {
								setTimeout(function() { 
									toOut();
								}, 1000/STEP);}
							LU_Enable(1);
						}
					}
					if (robot[a].toOUT) {
						robot[a].tick++;
						roFind(a, OUTPUT_X, OUTPUT_Y, false, 3);
					}
					if (robot[a].toHOM) {
						var xx = 8;
						var yy = 3;
						if (robot[a].tick > 4) {
							xx = 8 + Math.floor(Math.random() * (CELLS/2));
							if (robot[a].tick > 7)
								yy = robot[Math.floor(Math.random() * (ROBOTS - 1))].baseY;
						} else {
							var near = !($("#u2").is(":checked"));
							I = nearestBox(robot[a].X, robot[a].Y, near, true);
							if (I >= 0) {
								xx = box[I].X;
								yy = box[I].Y + box[I].j;
							}
						}
						robot[a].tick++;
						roFind(a, xx, yy, false, 4);
					}
				} else {
					s = DIR[0] + " :: — : —";
					var away = 0;
					for (var b = 0; b < (ROBOTS); b++) {
						if (a != b && (robot[a].Y == robot[b].Y || robot[a].Y == robot[b].TY) && robot[b].busy && robot[b].tick > 7) {
							away = 1;
							if (robot[b].tick > 14)
								away = 2;
						}
					}
					if (away > 0) {
						var xx = 8 + Math.floor(Math.random() * (CELLS/2));
						if (away == 2) {
							var yy = freeRow(robot[a].Y);
						} else {
							if (xx == robot[a].X)
								while (xx == robot[a].X)
									xx = 8 + Math.floor(Math.random() * (CELLS/2));
							var yy = robot[a].Y;
						}
						if (grid.isWalkableAt(xx, yy))
							roFind(a, xx, yy, false, 4);
					}
				}
				$("#r_state" + a).text(s);
				robot[a].task = s;
				robot[a].atime = 0;
				robot[a].aops = 0;
			}

			// прием груза роботами
			if (loads > 0) {
			for (var a = 0; a < (ROWS); a++) {
				if (AR[a] && load[a].status < 2 && load[a].alg < 2) {
					I = nearestRobot(load[a].X, load[a].Y);
					if (I >= 0) {
						roFind(I, load[a].X, load[a].Y, load[a], 0);
					}
				}
			}
		}

			ALG = $("#alg").val();
			tsk = "";
			if (TASK && inTask.length > 0)
				tsk = '<span style="color:#fff">' + inTask.join("<br/>") + '</span>';

			$("#stats").html((CELLS) + "x" + (ROWS) + "<br/>" + (ROBOTS) + " bots<br/>" + (Math.floor(STAT_rotime)) + " s<br/>" + (STAT_altime.toFixed(2)) + " ms<br/>" + (STAT_alops) + " ops<br/>" + (loadz) + "<br/><br/>" + tsk);

			sec();
		}, 1000/SPEED);
	}
	sec();

	// анимация процесса
	function animate() {
	    requestAnimFrame(animate);

		// обработка движения роботов на поворотной платформе
		for (var a = 0; a < (ROBOTS); a++) {
			if (robot[a].spaceRun) {
				robot[a].a0 += robot[a].a2 * SPEED/1.88;
				robot[a].rotation = robot[a].a0 * Math.PI/180;
				crossArr[robot[a].a3].rotation = robot[a].a0 * Math.PI/180;

				if (Math.abs(robot[a].a0 - robot[a].a1) <= SPEED || robot[a].a2 == 0) {
					robot[a].spaceRun = false;
					robot[a].space = false;
					robot[a].a0 = robot[a].a1;
					robot[a].rotation = robot[a].a1 * Math.PI/180;
					if (ROWS < 2)
						robot[a].a1 -=90;
					crossArr[robot[a].a3].rotation = (90 + robot[a].a1) * Math.PI/180;
					robot[a].tint = robot[a].RGB;
				}
			}
			if (robot[a].space && !robot[a].spaceRun) {
				if (AS[robot[a].X][robot[a].Y] == 3) {
					var T = AS[robot[a].X][robot[a].Y + 1] == 2;
					var D = AS[robot[a].X][robot[a].Y - 1] == 2;
					var L = AS[robot[a].X - 1][robot[a].Y] == 2;
					var R = AS[robot[a].X + 1][robot[a].Y] == 2;

					robot[a].tint = 0xddeeff;
					robot[a].spaceRun = true;
					robot[a].a2 = 0;
					robot[a].a1 = robot[a].a0;

					for (var i = 0; i < crossArr.length; i++) {
						var rail = crossArr[i];
						if (Math.sqrt(Math.pow(AX[robot[a].X][robot[a].Y] - rail.x, 2) + Math.pow(AY[robot[a].X][robot[a].Y] - rail.y, 2)) <= 1) {
							robot[a].a3 = i;
							i = crossArr.length;
						}
					}

					if (T && L && R) {
						if (robot[a].a0 == 0 || robot[a].a0 == 360) {
							robot[a].a0 = 360; robot[a].a1 = 270; robot[a].a2 = -1;
						} else {
							robot[a].a0 = 270; robot[a].a1 = 360; robot[a].a2 = 1;
						}
					} else if (D && (R || L)) {
						if (robot[a].a0 == 0 || robot[a].a0 == 360) {
							if (R) {
								robot[a].a0 = 360; robot[a].a1 = 270; robot[a].a2 = -1;
							} else {
								robot[a].a0 = 0; robot[a].a1 = 90; robot[a].a2 = 1;
							}
						} else {
							if (L) {
								robot[a].a0 = 90; robot[a].a1 = 0; robot[a].a2 = -1;
							} else {
								robot[a].a0 = 270; robot[a].a1 = 360; robot[a].a2 = 1;
							}
						}
					}
					

				}
			}
		}

		if (ADD) {
			ADD = false;
			toBuffer();
		}
		if (REM) {
			REM = false;
			toOut();
		}

		// анимация прибытия груза
		if (loads > 0) {
			for (var a = 0; a < (ROWS); a++) {
				if (AR[a] && load[a].step < 28) {
					load[a].step += 0.5;
					load[a].x += 1.75;
					load[a].scale.x = load[a].scale.y = STEP/(load[a].step);
				}
			}
		}

		renderer.render(stage);
	}

	document.onkeydown = function(event){
		events = event || window.event;
		if(events.keyCode == 27) {
			if (isBD) {
				$(".hdr").text("▲ БАЗА ДАННЫХ ▲");
				isBD = false;
				callBD();
			} else if (isLOG) {
				$("#console").fadeOut(250);
				$("#log").css({"z-index": "3", "font-weight": "normal", "font-size": "10pt", "color": "lime", "margin-left": 0});
				$("#log").text("строка состояния");
				isLOG = false;
			} else {
				window.open('','_parent','');
				window.close();
			}
		}
		if (events.keyCode > 47 && events.keyCode < 58) {
			if (events.keyCode == 48)
				$(".speed").val(100);
			else {
				SPEED = (events.keyCode - 48) * 10 - 5;
				$(".speed").val(SPEED);
			}
			updSpeed();
		}
		if (events.keyCode == 73) {
			if ($("#l3").is(":checked")) {
				$("html").css("cursor", "crosshair");
				$("#l0").css("opacity", 0.4);
				$('input[name="load"]').prop("disabled", true);
				$("#u0").css("opacity", 0.4);
				$('input[name="unload"]').prop("disabled", true);
				L_manual = true;
			}
			ADD = true;
		}
		if (events.keyCode == 79) {
			if ($("#u3").is(":checked")) {
				$("html").css("cursor", "all-scroll");
				$("#l0").css("opacity", 0.4);
				$('input[name="load"]').prop("disabled", true);
				$("#u0").css("opacity", 0.4);
				$('input[name="unload"]').prop("disabled", true);
				U_manual = true;
			}
			REM = true;
		}
	}
}

//RENDER(); // ERASE
