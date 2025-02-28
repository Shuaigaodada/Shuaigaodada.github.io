$(document).ready(runProgram);

function runProgram() {
  var FRAME_RATE = 60;
  var FRAMES_PER_SECOND_INTERVAL = 1000 / FRAME_RATE;

  var walker = {
    x: 0,
    y: 0,
    speedX: 0,
    speedY: 0
  };

  var KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40
  };

  var interval = setInterval(newFrame, FRAMES_PER_SECOND_INTERVAL);
  $(document).on('keydown', handleKeyDown);
  $(document).on('keyup', handleKeyUp);

  function newFrame() {
    repositionGameItem();
    wallCollision();
    redrawGameItem();
  }

  function handleKeyDown(event) {
    if (event.which === KEY.LEFT) {
      walker.speedX = -5;
    } else if (event.which === KEY.UP) {
      walker.speedY = -5;
    } else if (event.which === KEY.RIGHT) {
      walker.speedX = 5;
    } else if (event.which === KEY.DOWN) {
      walker.speedY = 5;
    }
  }

  function handleKeyUp(event) {
    if (event.which === KEY.LEFT || event.which === KEY.RIGHT) {
      walker.speedX = 0;
    } else if (event.which === KEY.UP || event.which === KEY.DOWN) {
      walker.speedY = 0;
    }
  }

  function repositionGameItem() {
    walker.x += walker.speedX;
    walker.y += walker.speedY;
  }

  function redrawGameItem() {
    $("#walker").css("left", walker.x);
    $("#walker").css("top", walker.y);
  }

  function wallCollision() {
    var boardWidth = $("#board").width();
    var boardHeight = $("#board").height();

    if (walker.x < 0) {
      walker.x = 0;
    } else if (walker.x > boardWidth - $("#walker").width()) {
      walker.x = boardWidth - $("#walker").width();
    }

    if (walker.y < 0) {
      walker.y = 0;
    } else if (walker.y > boardHeight - $("#walker").height()) {
      walker.y = boardHeight - $("#walker").height();
    }
  }

  function endGame() {
    clearInterval(interval);
    $(document).off();
  }
}