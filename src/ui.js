var ROWS = 1,
	CELLS = 8,
	ROBOTS = 1,
	SPEED = 5,
	OPS = 0,

	isBD = false,
	isUI = true,
	isLOG = false,

	L_manual = false,
	U_manual = false,

	ADD = false,
	REM = false,

	L_ti = false,
	U_ti = false,

	TASK = false,
	inTask = [],
	outTask = [];

// переменные для анализа данных (время работы роботов, время работы алгоритма, количество операций
var STAT_rotime = 0.0,
	STAT_altime = 0.000,
	STAT_alops = 0;

var  winY = $(window).height(),
	padds = $("#main").offset();

$("#main").offset({ top: padds.left, left: padds.left });
$("#main").height(winY - padds.left * 2);
$("#header").css( 'marginRight', padds.left + 30 + "px" );
$("#footer").css( 'right', padds.left + 30 + "px" );
$("#db").height(winY - padds.left * 2);
$("#console").height(winY - padds.left * 2);
$("#sList").height(winY - padds.left * 2 - 30);
$("#db").css( 'top', (winY - padds.left * 2 - 30) + "px" );
var dbTopOffset = 0 + parseInt($("#db").css("top"));
var dbCurOffset = dbTopOffset;

$("#footer").text(unescape("%u041A%u0410%u0428%u0423%u0411%u0410%20%u041F%u0410%u0412%u0415%u041B%20%A9%202014%2C%20%u041F%u0413%u0410%u0421%u0438%u0410%20%u0410%u0423%u0422%u041F-13%u043C"));

function Console(str) {
	if (!isLOG)
		$("#log").text(str);
	$("#console").prepend(" " + str + "<br/>");
}

$("#log").bind("click", function(e){
	if (!isLOG) {
		$("#console").show();
		$("#log").css({"z-index": "5", "font-weight": "bold", "font-size": "14pt", "color": "red", "margin-left": $("#main").width() - 280})
				 .text("[ ЗАКРЫТЬ КОНСОЛЬ ]");
		isLOG = true;
	} else {
		$("#console").fadeOut(250);
		$("#log").css({"z-index": "3", "font-weight": "normal", "font-size": "10pt", "color": "lime", "margin-left": 0})
				 .text("строка состояния");
		isLOG = false;
	}
});

$(window).resize(function() {
	padds = $("#main").offset();
	 winY = $(window).height();

	$("#main").offset({ top: padds.left, left: padds.left })
			  .height(winY - padds.left * 2);
	$("#db").height(winY - padds.left * 2);
	$("#console").height(winY - padds.left * 2);
	$("#sList").height(winY - padds.left * 2 - 30 - $("#rList").height());
});

$(".rb-first").bind("click", function(e){
	if($("#testMode").is(":checked")) {
		$("#initial").fadeOut(1000, function(){ $("#options").fadeIn(500); Console("Настройка: Выбрать параметры модели"); })
	}
});

$(".rb-second").bind("click", function(e){
	ROWS = Math.floor( $("#rows").val() );
	CELLS = Math.floor( $("#cells").val() );
	ROBOTS = Math.floor( $("#bots").val() );
	$("#options").fadeOut(1000, function(){ $("#render").fadeIn(500); $("#db").fadeIn(500); $("#ui").fadeIn(500); Console("строка состояния"); RENDER(); });

	$("#alg").val(0); // выбор базового алгоритма (A*)
});

$("#initA").bind("click", function(e){
	var $bar = $(".progress-bar");
		barCount = $bar.width() + 1;
		tempCount = 0;
	var barTi = setInterval(function() {
		barCount = barCount + 1 + barCount * .5;
		$bar.css("width", barCount + "%");
		if ((barCount > 5) && (tempCount < 1)) {
			tempCount++;
			$bar.css("backgroundColor", "#f63a0f");
		}
		if ((barCount > 25) && (tempCount < 2)) {
			tempCount++;
			$bar.css("backgroundColor", "#f27011");
			$(".register-title").text("Поиск контроллеров...");
			Console("Настройка: Поиск контроллеров...");
		}
		if ((barCount > 50) && (tempCount < 3)) {
			tempCount++;
			$bar.css("backgroundColor", "#f2b01e");
			$(".register-title").text("Опрос порта COM1...");
			Console("Настройка: Опрос порта COM1...");
		}
		if ((barCount > 75) && (tempCount < 4)) {
			tempCount++;
			$bar.css("backgroundColor", "#f2d31b");
			$(".register-title").text("Опрос порта COM2...");
			Console("Настройка: Опрос порта COM2...");
		}
		if ((barCount >= 100)) {
			$bar.css("backgroundColor", "#f63a0f");
			$bar.css("width", "100%");
			$(".rsw-first").addClass("r-s-active");
			$(".rs-first").css("cursor", "pointer");
			$("#testMode").prop("disabled", false);
			$("#testMode").bind("click", function(e){
				$(".register-title").text("Отладочный режим");
				$(".rb-first").css("color", "#333");
				$(".rb-first").css("cursor", "pointer");
				$bar.css("backgroundColor", "#86e01e");
				Console("Настройка: Активация отладочного режима");
			});
			$(".register-title").text("Контроллер не обнаружен");
			Console("Настройка: Контроллер не обнаружен");
			clearInterval(barTi);
		}

	}, 250);
	$("#initA").text("Инициализация...");
	$("#initA").css("cursor", "default");
	$("#initA").removeAttr("id");
});

$("#rows").noUiSlider({
	start: 1, connect: "lower", step: 1, range: { 'min': 1, 'max': 5 }
});
$("#cells").noUiSlider({
	start: 8, step: 2, range: { 'min': 8, 'max': 64 }
});
$("#bots").noUiSlider({
	start: 1, step: 1, connect: "lower", range: { 'min': 1, 'max': 5 }
});

$(".speed").noUiSlider({
	start: 5, step: 1, range: { 'min': 1, 'max': 100 }
});

$("#rows").on({ slide: function(){
	var rowsCount = Math.floor( $("#rows").val() );
	$("#rowsN").text( rowsCount );
	$("#botsL").text( rowsCount );
	if (Math.floor( $("#bots").val() ) > rowsCount) {
		$("#bots").val( rowsCount );
		$("#botsN").text( rowsCount );
	}
}});
$("#cells").on({ slide: function(){ $("#cellsN").text( Math.floor($("#cells").val()) ) }});
$("#bots").on({ slide: function(){
	var botsCount = Math.floor( $("#bots").val() );
	$("#botsN").text( botsCount );
	if (botsCount > $("#rows").val()) {
		$("#bots").val( Math.floor( $("#rows").val() ) );
		$("#botsN").text( Math.floor( $("#rows").val() ) );
	}
}});

function updSpeed() {
	SPEED = Math.floor( $(".speed").val() );
	Console("Панель: Ускорение имитации: x" + SPEED + " раз");
}

$(".speed").on({ slide: function(){
	updSpeed();
}});

function callBD() {
	var TI = setTimeout(function() {
		if (isBD) {
			dbCurOffset -= 50;
			if (dbCurOffset < 0)
				dbCurOffset = 0;
		} else {
			dbCurOffset += 50;
			if (dbCurOffset > dbTopOffset)
				dbCurOffset = dbTopOffset;
		}
		$("#db").css( "top", dbCurOffset + "px" );
		if ((isBD && dbCurOffset <= 0) || (!isBD && dbCurOffset >= dbTopOffset)) { clearTimeout(TI) } else { callBD() }
	}, 10);
}

$(".hdr").bind("click", function(e){
	if (!isBD) {
		$(this).text("▼ БАЗА ДАННЫХ ▼");
		isBD = true;
	} else {
		$(this).text("▲ БАЗА ДАННЫХ ▲");
		isBD = false;
	}
	callBD();
});

$("#alg").change(function () {
	Console("Панель: Смена алгоритма поиска пути: " + $("#alg option:selected" ).text());
});

$("#l4").change(function(event) {
	if ($(this).is(":checked")) {
		L_ti = true;
		$("#u0").css("opacity", 0.4);
		$('input[name="unload"]').prop("disabled", true);
		$("#l3").prop("disabled", true);
		$(".l3").css("color", "#666");
		if ($("#l3").is(":checked")) {
			$("#l3").prop("checked", false);
			$("#l1").prop("checked", true);
			L_manual = false;
		}
	} else {
		L_ti = false;
		if (loadz > 0) {
			$("#u0").css("opacity", 1);
			$('input[name="unload"]').prop("disabled", false);
		}
		$("#l3").prop("disabled", false);
		$(".l3").css("color", "#fff");
	}
});
$("#u4").change(function(event) {
	if ($(this).is(":checked")) {
		U_ti = true;
		$("#l0").css("opacity", 0.4);
		$('input[name="load"]').prop("disabled", true);
		$("#u3").prop("disabled", true);
		$(".u3").css("color", "#666");
		if ($("#u3").is(":checked")) {
			$("#u3").prop("checked", false);
			$("#u1").prop("checked", true);
			U_manual = false;
		}
	} else {
		U_ti = false;
		$("#u3").prop("disabled", false);
		$(".u3").css("color", "#fff");
		if (loadz < boxes) {
			$("#l0").css("opacity", 1);
			$('input[name="load"]').prop("disabled", false);
		}
	}
});
$(".c1").bind("click", function(e){
	L_ti = $("#l4").is(":checked");
	if (!L_manual && !U_manual && $("#l0").css("opacity") == 1) {
		if ($("#l3").is(":checked")) {
			$("html").css("cursor", "crosshair");
			$("#l0").css("opacity", 0.4);
			$('input[name="load"]').prop("disabled", true);
			$("#u0").css("opacity", 0.4);
			$('input[name="unload"]').prop("disabled", true);
			L_manual = true;
		} else
			L_manual = false;
		ADD = true;
		if (L_ti && loadz == 0)
			STAT_rotime = STAT_altime = STAT_alops = 0;
	}
});
$(".c2").bind("click", function(e){
	U_ti = $("#u4").is(":checked");
	if (!L_manual && !U_manual && $("#u0").css("opacity") == 1) {
		if ($("#u3").is(":checked")) {
			$("html").css("cursor", "all-scroll");
			$("#l0").css("opacity", 0.4);
			$('input[name="load"]').prop("disabled", true);
			$("#u0").css("opacity", 0.4);
			$('input[name="unload"]').prop("disabled", true);
			U_manual = true;
		} else if (loadz < boxes && !U_ti) {
			$(".l3").css("color", "#fff");
			$("#l3").prop("disabled", false);
			$("#l0").css("opacity", 1);
			$('input[name="load"]').prop("disabled", false);
			U_manual = false;
		}
		REM = true;
		if (U_ti && loadz >= boxes)
			STAT_rotime = STAT_altime = STAT_alops = 0;
	}
});
$(".c4").bind("click", function(e){
	var task = prompt("json task file (url):", "http://i.ewix.ru/task.json");
	if (task) {
		$(".c4 div").fadeOut(800);

		jsReq = new XMLHttpRequest();
		jsReq.open("GET", task, true);
		jsReq.onload = function() {
			if (jsReq.status >= 200 && jsReq.status < 400) {
				var data = JSON.parse(jsReq.responseText);
				Console("НОВОЕ ЗАДАНИЕ: " + jsReq.responseText);

				TASK = true;
				$.each(data, function(SID, tag){
					inTask.push(SID.substr(1) + "|" + tag);
				});

				$("#u0").append('<select id="outTask"><option value="">—</option></select>');
				$("#outTask").change(function () {
					if ($("#outTask option:selected").val()) {
						TASK = true;
						outTask.push(($("#outTask option:selected").val() - 1) + "|" + $("#outTask option:selected").text());

						REM = true;

						$("#outTask option:selected").remove();
						$("#outTask").val($("#outTask option:first").val());
						if ($("#outTask option").length < 2) {
							$("#outTask").remove();
						}
					}
				});

				ADD = true;
			} else {
				Console("ОШИБКА: Не удалось загрузить задание!");
			}
		}
		jsReq.onerror = function() {
			Console("ОШИБКА: Не удалось загрузить задание!");
		}

		jsReq.send();
	}
});
function LU_Enable(delta) {
	loadz += delta;
	if (!L_manual && !U_manual) {
		$("html").css("cursor", "auto");
	}
	if (loadz < boxes) {
		if (!L_manual && !U_manual && !L_ti && !U_ti) {
			$("#l0").css("opacity", 1);
			$('input[name="load"]').prop("disabled", false);
			$("#l3").prop("disabled", false);
		}
	} else {
		L_ti = false;
		$("#l4").prop("checked", false);
		$("#l3").prop("disabled", true);
		$("#l0").css("opacity", 0.4);
		$('input[name="load"]').prop("disabled", true);
		$("#u0").css("opacity", 1);
		$('input[name="unload"]').prop("disabled", false);
	}
	if (loadz > 0) {
		if (!L_manual && !U_manual && !L_ti && !U_ti) {
			$("#u3").prop("disabled", false);
			$("#u0").css("opacity", 1);
			$('input[name="unload"]').prop("disabled", false);
		}
	} else {
		U_ti = false;
		$("#u4").prop("checked", false);
		$("#u3").prop("disabled", true);
		$("#u0").css("opacity", 0.4);
		$('input[name="unload"]').prop("disabled", true);
		$("#l0").css("opacity", 1);
		$('input[name="load"]').prop("disabled", false);
		$("#l3").prop("disabled", false);
		$(".l3").css("color", "#fff");
	}
}
$("#l1").prop("checked", true);
$("#u1").prop("checked", true);
$("#u0").css("opacity", 0.4);
$('input[name="unload"]').prop("disabled", true);

function toggleUI() {
	if (isUI) {
		isUI = false;
		$(".c1").toggle(200);
		$(".c2").toggle(200);
		$(".window").toggle(500);
		$(".c3 > div").text("▼ ОТКРЫТЬ ПАНЕЛЬ ▼");
	} else {
		isUI = true;
		$(".c1").toggle(500);
		$(".c2").toggle(500);
		$(".window").toggle(500);
		$(".c3 > div").text("▲ СВЕРНУТЬ ПАНЕЛЬ ▲");
	}
}
