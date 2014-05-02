
var ariApp = angular.module('ariApp', []);
ariApp.controller('AriCtrl', function($scope) {
  $scope.stats = stats;

  //console.log(localStorage.getItem("key1"));

  var antImage = new Image();
  antImage.src = "img/ant.png";
  antImage.onload = function() {
    onImageLoaded();
  };

  var anteaterImage1 = new Image();
  anteaterImage1.src = "img/arikui1.png";
  anteaterImage1.onload = function() {
    onImageLoaded();
  };
  var anteaterImage2 = new Image();
  anteaterImage2.src = "img/arikui2.png";
  anteaterImage2.onload = function() {
    onImageLoaded();
  };

  function onImageLoaded() {
    if(antImage.complete && anteaterImage2.complete && anteaterImage1.complete) {
      drawObjects();
    }
  }

  var stats = {
    clickCount: 0,
    killCount: 0,
    eatCount: 0,
    crushCount: 0,
    specialCrushCount: 0,
    missCount: 0,
    turnCount: 0,
    specialCount: 0,
  };
  $scope.stats = stats;

  var eaters = [];

  function summonAnteater() {
    var x = Math.random() * (width - margin*2) + margin;
    var y = Math.random() * (height - margin*2) + margin;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    eaters.push(new Anteater(x, y, r));
    //updateAntCount();
  }

  var started = false;

  var Enemy = function() {
    this.antsPerTurn = 3;
  };

  Enemy.prototype.nextTurn = function(numTurns) {
    this.antsPerTurn = Math.floor(3 + numTurns * 1.0);
  };

  var enemy = new Enemy();

  var UserStatus = function(initValue, maxValue, step) {
    this.initValue = initValue;
    this.value = initValue;
    this.step = step;
    this.maxValue = maxValue;
  };

  UserStatus.prototype.update = function(level) {
    this.value = Math.floor(Math.min(
          this.maxValue, this.initValue + this.step * level));
  };

  var User = function() {
    this.health = 2000;
    this.clicksPerTurn = 3;
    this.clicks = this.clicksPerTurn;
    this.motivation = 0;
    this.levelupRate = 5;
    this.level = 1;

    this.skillPoint = 0;

    this.crushUpgrade = 0;
    this.radius = new UserStatus(12, 50, 1);
    this.crushKill = new UserStatus(1, 30, 1);

    this.specialUpgrade = 0;
    this.specialRate = 0.02;
    this.specialKill = 16;

    this.eaterUpgrade = 0;
    this.eaterMove = new UserStatus(8, 24, 1);
    this.eaterRadius = new UserStatus(30, 60, 3);
    this.eaterEat = new UserStatus(3, 30, 1);
  };

  User.prototype.clicked = function() {
    if(this.clicks > 0) {
      this.clicks--;
      return true;
    } else {
      return false;
    }
  };

  User.prototype.levelup = function() {
    var snd = new Audio("se/level.wav");
    snd.play();
    this.level++;
    this.levelupRate = this.levelupRate + (this.level - 1) * 10 + 5;
    this.skillPoint += 2;
    updateStats();
  };

  User.prototype.killed = function() {
    this.motivation++;
    if(this.motivation >= this.levelupRate) {
      this.levelup();
    }
  };

  function statsRow(label, data) {
    var cont = "";
    cont += "<tr><td>"+label+"</td>";
    cont += "<td>"+data+"</td></tr>";
    return cont;
  }

  function gameover() {
    stop();
    var cont = "";
    cont += '<div id="gameover">';
    cont += "<h1>GAME OVER</h1>";
    cont += "<table><tbody>";
    cont += statsRow("駆除したアリ", stats.killCount);
    cont += statsRow("ターン数", stats.turnCount);
    cont += statsRow("クリック数", stats.clickCount);
    cont += statsRow("ミスクリック数", stats.missCount);
    cont += statsRow("食べたアリ", stats.eatCount);
    cont += statsRow("潰したアリ", stats.crushCount+stats.specialCrushCount);
    cont += statsRow("必殺で潰したアリ", stats.specialCrushCount);
    cont += statsRow("必殺回数", stats.specialCount);
    cont += "</tbody></table>"
      cont += "</div>";
    $("#container").html(cont);
  }

  User.prototype.nextTurn = function() {
    this.health -= ants.length;
    if(this.health <= 0) {
      this.health = 0;
      gameover();
    }
    this.clicks = this.clicksPerTurn;
  };

  var user = new User();
  $scope.user = user;

  var Drawable = function(x, y, rotate) {
    this.x = x;
    this.y = y;
    this.rotate = rotate ? rotate : 0;
  };

  Drawable.prototype.centerCoords = function() {
    var cx = this.x + 0.5 * this.imageWidth;
    var cy = this.y + 0.5 * this.imageHeight;
    return { x: cx, y: cy };
  }

  Drawable.prototype.draw = function(context) {
    if (this.rotate) {
      context.save();
      context.rotate(this.rotate);
    }
    context.drawImage(this.image, this.x, this.y, this.imageWidth, this.imageHeight);
    context.restore();
  }

  var Ant = function(x, y, rotate) {
    Drawable.call(this, x, y, rotate);
    this.image = antImage;
    this.imageWidth = 18;
    this.imageHeight = 25;
  };
  Ant.prototype = Object.create(Drawable.prototype);

  Ant.prototype.withinArea = function(x, y) {
    return this.x <= x && this.x + antWidth >= x && this.y <= y && this.y + antHeight >= y;
  };

  var Anteater = function(x, y, rotate) {
    Drawable.call(this, x, y, rotate);
    this.image = anteaterImage2;
    this.imageWidth = 30;
    this.imageHeight = 30;
    //  this.eatRadius = 60;
  };
  Anteater.prototype = Object.create(Drawable.prototype);

  Anteater.prototype.drawRadius = function(context) {
    var center = this.centerCoords();
    var left = center.x - user.eaterRadius.value;
    var top = center.y - user.eaterRadius.value;
    context.fillStyle = "#DDE";
    context.fillRect(left, top, user.eaterRadius.value * 2, user.eaterRadius.value * 2);
  };

  Anteater.prototype.swapImage = function() {
    this.image = this.image == anteaterImage2 ? anteaterImage1 : anteaterImage2;
  };

  function allAntsWithin(centerX, centerY, radius, max) {
    var ret = [];
    $.each(ants, function(i, e) {
      var ant = this.centerCoords();
      var dx = Math.abs(centerX - ant.x);
      var dy = Math.abs(centerY - ant.y);
      if(dx <= radius && dy <= radius) {
        ret.push(i);
        if(max && ret.length >= max) {
          return ret;
        }
      }
    });
    return ret;
  }

  Anteater.prototype.eat = function() {
    var eater = this.centerCoords();
    var radius = user.eaterRadius.value;
    var toBeEaten = allAntsWithin(eater.x, eater.y, user.eaterRadius.value, user.eaterEat.value);
    toBeEaten.sort();
    var n = toBeEaten.length
      stats.eatCount += n;
    while(n > 0) {
      var snd = Math.random() > 0.8 ? eatSound2 : eatSound1;
      killed(toBeEaten[--n], snd);
    }
  };

  function updateStats() {
    //  $("#health").text("健康: "+user.health);
    //  $("#click-count").text("あと "+user.clicks+"クリック！");
    //  $("#kill-count").text("現在の本気："+user.motivation+"");
    //  $("#skill-point").text("スキルポイント："+user.skillPoint+"");
    //  $("#level").text("レベル："+user.level+"");
    if(user.skillPoint > 0) {
      enableUpgradeButtons();
    }
    $scope.$digest();
  }

  var width = 480;
  var height = 480;

  var margin = 50;
  var maxRotate = 0.02;
  var antWidth = 18;
  var antHeight = 25;

  var ants = [];
  $scope.ants = ants;
  function updateAntCount() {
    //$("#ant-count").text("今のアリの数：　"+ants.length);
    $scope.$digest();
  }

  function addAnt(redraw) {
    redraw = typeof redraw == 'undefined' ? redraw : true;
    var x = Math.random() * (width - margin*2) + margin;
    var y = Math.random() * (height - margin*2) + margin;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    ants.push(new Ant(x, y, r));
    if(redraw)
      updateAntCount();
  }

  function dieRandom() {
    if(ants.length > 0) {
      var i = Math.random() * ants.length;
      killed(i);
      return true;
    } else {
      return false;
    }
  }


  $("#myCanvas").click(function(e) {
    stats.clickCount++;
    if(!started) {
      start();
    }
    if(!user.clicked()) {
      return;
    }
    var x = e.pageX - this.offsetLeft;
    var y = e.pageY - this.offsetTop;

    var killing = allAntsWithin(x, y, user.radius.value);
    killing.sort();
    var n = killing.length;
    if(n > 0) {
      while(n > 0) {
        stats.crushCount++;
        killed(killing[--n]);
      }
      if(Math.random() > 1.0 - user.specialRate) {
        special();
      }
    } else {
      stats.missCount++;
    }

    if(user.clicks == 0) {
      nextturn();
    }
    updateStats();
  });

  function killed(i, sound) {
    if(sound) {
      sound.play();
    } else {
      playDead();
    }
    ants.splice(i, 1);
    drawObjects();
    user.killed();
    updateStats();
    updateAntCount();
    stats.killCount++;
  }

  function playDead() {
    var file = 0.7 < Math.random() ? "se/dead1.wav" : "se/dead2.wav";
    var snd = new Audio(file);
    snd.play();
  }

  function special() {
    stats.specialCount++;
    var snd = new Audio("se/special.wav");
    snd.play();
    var n = user.specialKill;
    setTimeout(function() {
      var loop = setInterval(function() {
        if(--n === 0) {
          clearInterval(loop);
        }
        if(dieRandom()) {
          stats.specialCrushCount++;
        }
      }, 50);
    }, 2000)
  }

  function drawObjects() {
    var canvas = $("#myCanvas")[0];
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d");
    $.each(eaters, function() {
      this.drawRadius(context);
    });
    $.each(eaters, function() {
      this.draw(context);
    });
    $.each(ants, function() {
      this.draw(context);
    });
  }

  function addAnts(n, redraw) {
    while (n--) { addAnt(redraw); };
  }

  var antLoop;
  var drawLoop;
  function start() {
    antLoop = setInterval(function() {
      addAnt();
      drawObjects();
    }, 2000);
    started = true;
    updateStats();
  }

  function stop() {
    clearInterval(antLoop);
    clearInterval(drawLoop);
  }

  var eatSound1 = new Audio("se/perori1.wav");
  var eatSound2 = new Audio("se/perori2.wav");

  function eat() {
    setTimeout(function() {
      $.each(eaters, function() {
        this.eat();
      });
    }, 300);
  }

  function nextturn() {
    stats.turnCount++;
    user.nextTurn();
    enemy.nextTurn(stats.turnCount);
    addAnts(enemy.antsPerTurn, false);
    drawObjects();
    setTimeout(function() {
      eat();
    }, 1);
    updateStats();
  }

  function randomMove(obj, ammount) {
    var left = obj.x;
    var right = obj.x + obj.imageWidth;
    var top = obj.y;
    var bottom = obj.y + obj.imageHeight;
    obj.x += Math.random() * ammount * 2 - ammount;
    if(left < 0) x = obj.x = 0;
    if(right > width) obj.x = width - obj.imageWidth;
    obj.y += Math.random() * ammount * 2 - ammount;
    if(top < 0) obj.y = 0;
    if(bottom > height) obj.y = height - obj.imageHeight;
  }

  var frame = 0;
  $scope.init = function() {
    addAnts(5);
    summonAnteater();
    summonAnteater();
    drawObjects();
    drawLoop = setInterval(function() {
      var shouldEaterMove = ++frame % 6 == 0;
      var shouldEaterFlip = frame % 2 == 0;
      $.each(eaters, function() {
        if(shouldEaterFlip) this.swapImage();
        if(shouldEaterMove) randomMove(this, user.eaterMove.value);
      });
      $.each(ants, function() {
        randomMove(this, 5);
      })
      drawObjects();
    }, 250);
  };

  function enableUpgradeButtons() {
    $("#eater-upgrade").removeAttr("disabled");
    $("#crush-upgrade").removeAttr("disabled");
    $("#special-upgrade").removeAttr("disabled");
  }

  function disableUpgradeButtons() {
    $("#eater-upgrade").attr("disabled", "true");
    $("#special-upgrade").attr("disabled", "true");
    $("#crush-upgrade").attr("disabled", "true");
  }

  function upgrade() {
    disableUpgradeButtons();
    user.skillPoint--;
    updateStats();
  }

  $("#eater-upgrade").click(function() {
    upgrade();
    user.eaterUpgrade++;
    var m = user.eaterUpgrade % 2;
    if(m == 1) {
      summonAnteater();
      drawObjects();
    } else {
      var lvl = user.eaterUpgrade * 0.5;
      user.eaterMove.update(lvl);
      user.eaterRadius.update(lvl);
      user.eaterEat.update(lvl);
    }
  });

  $("#crush-upgrade").click(function() {
    upgrade();
    user.crushUpgrade++;
    var lvl = user.crushUpgrade;
    user.crushUpgrade.update(lvl);
    user.crushKill.update(lvl);
  });

  $("#special-upgrade").click(function() {
    upgrade();
    user.specialUpgrade++;
    var m = user.specialUpgrade % 2;
    if(m == 0) {
      user.specialRate = 1.0 - ((1.0 - user.specialRate) * 0.99);
    } else {
      user.specialKill += 4;
    }
  });
});
