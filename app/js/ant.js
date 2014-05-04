'use strict';

var ariCtrl = function($scope, $log, $interval, $timeout, $location, appData, sound) {

  var stats = appData.getStats();
  $scope.stats = stats;

  sound.load({
    'level': "se/level.mp3",
    'special': "se/special.mp3",
    'eat1': "se/perori1.mp3",
    'eat2': "se/perori2.mp3",
    'dead1': "se/dead1.mp3",
    'dead2': "se/dead2.mp3",
  });
  sound.updateVolume(0.1);

  var antImageReversed = new Image();
  antImageReversed.src = "img/ant_r.png";

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

  var eaters = [];
  $scope.eaterCount = 0;

  function summonAnteater() {
    var x = Math.random() * (width - margin*2) + margin;
    var y = Math.random() * (height - margin*2) + margin;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    var eater = new Anteater(x, y, r);
    eaters.push(eater);
    return eater;
  }

  var started = false;

  var Enemy = function() {
    this.antsPerTurn = 3;
  };

  Enemy.prototype.nextTurn = function(numTurns) {
    this.antsPerTurn = 3 + Math.floor(Math.max(Math.pow(numTurns, 1.333) * 0.1), this.numTurns * 0.3);
  };

  var enemy = new Enemy();

  var UserStatus = function(initValue, maxValue, step, floating) {
    this.floating = floating;
    this.initValue = initValue;
    this.value = initValue;
    this.step = step;
    this.maxValue = maxValue;
  };

  UserStatus.prototype.update = function(level) {
    var v = Math.min(
          this.maxValue, this.initValue + this.step * level);
    this.value = this.floating ? v : Math.floor(v);
  };

  var User = function() {
    this.health = 3000;
    this.clicksPerTurn = 3;
    this.clicks = this.clicksPerTurn;
    this.motivation = 0;
    this.levelupRate = 5;
    this.level = 1;

    this.skillPoint = 10;

    this.specialUpgrade = 0;
    this.specialRate = new UserStatus(0.0, 1.0, 0.008, true);
    this.specialKill = new UserStatus(16, 1000, 2);

    this.eaterUpgrade = 0;
    this.eaterMove = new UserStatus(10, 60, 2);
    this.eaterRadius = new UserStatus(80, 90, 1);
    this.eaterRate = new UserStatus(0.5, 1.0, 0.005, true);
    this.eaterEat = new UserStatus(3, 9, 0.2);
    this.eaterCost = 3;

    this.crushUpgrade = 0;
    this.crushRadius = new UserStatus(7, 80, 2.5, true);
    this.crushKill = new UserStatus(0, 1000, 1);

    this.defenseUpgrade = 0;
    this.defense = new UserStatus(2, 1000, 8);
  };

  User.prototype.levelup = function() {
    sound.play('level');
    var nextLevel = Math.floor(Math.pow(this.level, 1.25) * 8 + 5);
    this.level++;
    this.levelupRate = this.levelupRate + nextLevel;
    this.skillPoint += 2;
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
    $location.path("/stats");
  }

  User.prototype.nextTurn = function(turnCount) {
    var dmg = ants.length - this.defense.value;
    if(dmg > 0)
      this.health -= dmg;
    if(this.health <= 0) {
      this.health = 0;
      gameover();
    }
    this.clicks = this.clicksPerTurn;
  };

  var user = new User();
  $scope.user = user;
  $scope.skillPointStyle = function() {
    return user.skillPoint > 0 ? "btn btn-danger" : "btn btn-primary";
  };

  var Drawable = function(x, y, rotate) {
    this.x = x;
    this.y = y;
    this.rotate = rotate ? rotate : 0;
  };

  Drawable.prototype.centerCoords = function() {
    var cx = this.x + 0.5 * this.imageWidth;
    var cy = this.y + 0.5 * this.imageHeight;
    return { x: cx, y: cy };
  };

  Drawable.prototype.draw = function(context, image) {
    image = typeof image == 'undefined' ? this.image : image;
    if (this.rotate) {
      context.save();
      context.rotate(this.rotate);
    }
    context.drawImage(image, this.x, this.y, this.imageWidth, this.imageHeight);
    context.restore();
  };

  Drawable.prototype.erase = function(context) {
    this.draw(context, this.reverseImage);
  };

  var Ant = function(x, y, rotate) {
    Drawable.call(this, x, y, rotate);
    this.image = antImage;
    this.reverseImage = antImageReversed;
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
    this.imageWidth = 40;
    this.imageHeight = 40;
  };
  Anteater.prototype = Object.create(Drawable.prototype);

  Anteater.prototype.drawRadius = function(context) {
    var center = this.centerCoords();
    drawCircle(context, center.x, center.y, user.eaterRadius.value);
  };

  Anteater.prototype.swapImage = function() {
    this.image = this.image == anteaterImage2 ? anteaterImage1 : anteaterImage2;
  };

  function allAntsWithin(centerX, centerY, radius, max) {
    var ret = [];
    var r2 = Math.pow(radius, 2);
    angular.forEach(ants, function(e, i) {
      var ant = e.centerCoords();
      var x2 = Math.pow(centerX - ant.x, 2);
      var y2 = Math.pow(centerY - ant.y, 2);
      if(x2 + y2 <= r2) {
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
    this.drawRadius(canvas.getContext('2d'));
    var radius = user.eaterRadius.value;
    var toBeEaten = allAntsWithin(eater.x, eater.y, user.eaterRadius.value, user.eaterEat.value);
    toBeEaten.sort(function(a, b) { return a - b; });
    var n = toBeEaten.length;
    if(n > 0) {
      sound.play(Math.random() > 0.8 ? 'eat2' : 'eat1');
    }
    while(n > 0 && ants.length > 0) {
      var i = toBeEaten[--n];
      if(Math.random() < user.eaterRate.value) {
        killed(i, null);
        stats.eatCount++;
      }
    }
  };

  function updateStats() {
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

  function addAnt() {
    var x = Math.random() * (width - margin*2) + margin;
    var y = Math.random() * (height - margin*2) + margin;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    var ant = new Ant(x, y, r);
    ants.push(ant);
    return ant;
  }

  function dieRandom() {
    if(ants.length > 0) {
      var i = Math.floor(Math.random() * ants.length);
      var context = canvas.getContext("2d");
      ants[i].erase(context);
      killed(i);
      return true;
    } else {
      return false;
    }
  }

  function drawCircle(context, x, y, r) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = "rgba(255, 232, 240, 0.3)";
    context.fill();
  }

  $scope.canvasClick = function(e) {
    stats.clickCount++;
    if(!started) {
      start();
    }
    if(user.clicks <= 0) return;
    var isLast = user.clicks == 1;
      --user.clicks;

    var x = e.offsetX;
    var y = e.offsetY;
    var r = user.crushRadius.value;

    var context = canvas.getContext("2d");
    drawCircle(context, x, y, r);
    var killing = allAntsWithin(x, y, r);
    killing.sort(function(a, b) { return a - b; });
    var n = Math.min(killing.length, Math.max(1, user.crushKill.value));
    if(n > 0) {
      while(n > 0 && ants.length > 0) {
        var i = killing[--n];
        var ant = ants[i];
        if(ant) {
          ant.erase(context);
        }
        killed(i);
        stats.crushCount++;
      }
      if(Math.random() < user.specialRate.value) {
        special();
      }
    } else {
      stats.missCount++;
    }

    if(isLast) {
      nextTurn();
    }
  };

  function killed(i, snd) {
    if(snd === null) {
    } else if(snd) {
      sound.play(snd);
    } else {
      sound.play(Math.random() > 0.7 ? 'dead1' : 'dead2');
    }
    ants.splice(i, 1);
    user.killed();
    stats.killCount++;
  }

  function special() {
    stats.specialCount++;
    sound.play('special');
    var n = Math.min(user.specialKill.value, ants.length);
    var t1 = n > user.specialKill.value > 42 ? 33 : 66;
    var t2 = Math.max(t1, 2400 - t1 * n);
    n = user.specialKill.value;
    $timeout(function() {
      var loop = $interval(function() {
        if(--n <= 0 || ants.length <= 0) {
          $interval.cancel(loop);
        }
        if(dieRandom()) {
          stats.specialCrushCount++;
        } else {
          $interval.cancel(loop);
        }
      }, t1);
    }, t2);
  }

  var canvas = angular.element("#myCanvas")[0];
  function clearCanvas(canvas) {
    canvas.width = canvas.width;
  }

  function drawObjects() {
    if(canvas.width != width) {
      canvas.width = width;
      canvas.height = height;
    }
    clearCanvas(canvas);
    var context = canvas.getContext("2d");
//    $.each(eaters, function() {
//      this.drawRadius(context);
//    });
    angular.forEach(eaters, function(e) {
      e.draw(context);
    });
    angular.forEach(ants, function(e) {
      e.draw(context);
    });
  }

  function addAnts(n, redraw) {
    var added = [];
    while (n--) { added.push(addAnt()); }
    return added;
  }

  var antIncoming = false;
  var drawLoop;
  function start() {
    antIncoming = true;
  }

  function stop() {
    antIncoming = false;
    $interval.cancel(drawLoop);
  }


  function eat() {
    $timeout(function() {
      angular.forEach(eaters, function(e) {
        e.eat();
      });
    }, 300);
  }

  function nextTurn() {
    stats.turnCount++;
    user.nextTurn(stats.turnCount);
    enemy.nextTurn(stats.turnCount);
    var added = addAnts(enemy.antsPerTurn, false);
    var context = canvas.getContext("2d");
    angular.forEach(added, function(e) {
      e.draw(context);
    });
    $timeout(function() {
      eat();
    }, 1);
  }

  function randomMove(obj, ammount) {
    var left = obj.x;
    var right = obj.x + obj.imageWidth;
    var top = obj.y;
    var bottom = obj.y + obj.imageHeight;
    obj.x += Math.random() * ammount * 2 - ammount;
    if(left < 0) obj.x = 0;
    if(right > width) obj.x = width - obj.imageWidth;
    obj.y += Math.random() * ammount * 2 - ammount;
    if(top < 0) obj.y = 0;
    if(bottom > height) obj.y = height - obj.imageHeight;
  }

  var frame = 0;
  $scope.init = function() {
    user.specialUpgrade = 2;
    user.eaterUpgrade = 2;
    user.crushUpgrade = 1;
    user.defenseUpgrade = 1;
    user.specialRate.update(user.specialUpgrade);
    user.specialKill.update(user.specialUpgrade);
    user.eaterMove.update(user.eaterUpgrade);
    user.eaterRadius.update(user.eaterUpgrade);
    user.eaterEat.update(user.eaterUpgrade);
    user.crushRadius.update(user.crushUpgrade);
    user.crushKill.update(user.crushUpgrade);
    user.defense.update(user.defenseUpgrade);
    addAnts(5);
    summonAnteater();
    $scope.eaterCount = eaters.length;
    drawLoop = $interval(function() {
      var shouldEaterMove = ++frame % 6 === 0;
      var shouldEaterFlip = frame % 2 === 0;
      var shouldAddAnt = antIncoming && (frame % 8 === 0);
      if(shouldAddAnt) {
        addAnt();
      }
      angular.forEach(eaters, function(e) {
        if(shouldEaterFlip) e.swapImage();
        if(shouldEaterMove) randomMove(e, user.eaterMove.value);
      });
      angular.forEach(ants, function(e) {
        randomMove(e, 5);
      });
      drawObjects();
    }, 250);
  };

  $scope.defenseUpgrade = function() {
    user.skillPoint--;
    user.defenseUpgrade++;
    var lvl = user.defenseUpgrade;
    user.defense.update(lvl);
  };

  $scope.eaterUpgrade = function() {
    var m = user.eaterUpgrade % user.eaterCost;
    var newEater = m == 2;
    user.skillPoint--;
    user.eaterUpgrade++;
    if(newEater) {
      $scope.eaterCount++;
    }
    var lvl = user.eaterUpgrade;
    user.eaterMove.update(lvl);
    user.eaterRadius.update(lvl);
    user.eaterEat.update(lvl);
    user.eaterRate.update(lvl);
    if(newEater) {
      summonAnteater().draw(canvas.getContext('2d'));
    }
  };

  $scope.crushUpgrade = function() {
    user.skillPoint--;
    user.crushUpgrade++;
    var lvl = user.crushUpgrade;
    user.crushRadius.update(lvl);
    user.crushKill.update(lvl);
  };

  $scope.specialUpgrade = function() {
    user.skillPoint--;
    user.specialUpgrade++;
    var lvl = user.specialUpgrade;
    user.specialRate.update(lvl);
    user.specialKill.update(lvl);
  };
};

var app = angular.module('ariCtrls', []);

app.service('appData', function() {
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

  this.getStats = function() {
    return stats;
  };
});

app.service('sound', function() {
  var repo = {};
  var muted = false;
  var volume = 1.0;

  this.load = function(m) {
    for(var k in m) {
      repo[k] = new Audio(m[k]);
    }
  };

  this.updateVolume = function(v) {
    for (var k in repo) {
      repo[k].volume = v;
    }
  };

  this.play = function(key) {
    if(!muted) {
      var snd = repo[key];
      if(snd)
        snd.play();
    }
  };
});

app.controller('StatsCtrl', [
    '$scope',
    '$location',
    'appData',
    function($scope, $location, appData) {
      $scope.stats = appData.getStats();
      if($scope.stats.turnCount === 0) {
        $location.path('/game');
      }
    }]);

app.controller('AriCtrl', [
    '$scope',
    '$log',
    '$interval',
    '$timeout',
    '$location',
    'appData',
    'sound',
    ariCtrl]);
app.directive("ant", function() {
  return {
  };
});
