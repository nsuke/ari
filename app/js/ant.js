'use strict';

var ariApp = angular.module('ariApp', []);
ariApp.controller('AriCtrl', function($scope) {
  $scope.stats = stats;

  var muted = false;

  //console.log(localStorage.getItem("key1"));

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
    //console.log("ants per turn: " + this.antsPerTurn);
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

    this.skillPoint = 0;

    this.specialUpgrade = 0;
    this.specialRate = new UserStatus(0.0, 1.0, 0.008, true);
    this.specialKill = new UserStatus(6, 1000, 2);

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

  var levelSound = new Audio("se/level.mp3");
  User.prototype.levelup = function() {
    var snd = new Audio("se/level.wav");
    if(!muted) levelSound.play();
    var nextLevel = Math.floor(Math.pow(this.level, 1.25) * 8 + 5);
    this.level++;
    this.levelupRate = this.levelupRate + nextLevel;
    //this.skillPoint += Math.floor(this.level * 0.2) + 1;
    this.skillPoint += 2;
    //updateStats();
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
    cont += "</tbody></table>";
      cont += "</div>";
    $("#container").html(cont);
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
    //  this.eatRadius = 60;
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
    $.each(ants, function(i, e) {
      var ant = this.centerCoords();
      var x2 = Math.pow(centerX - ant.x, 2);
      var y2 = Math.pow(centerY - ant.y, 2);
      if(x2 + y2 <= r2) {
        ret.push(i);
        if(max && ret.length >= max) {
          //console.log("eat max: " + max);
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
      var snd = Math.random() > 0.8 ? eatSound2 : eatSound1;
      if(!muted) snd.play();
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
  $scope.antCount = 0;
  function updateAntCount() {
    $scope.$apply(function() {
      $scope.antCount = ants.length;
    });
  }

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

  $("#myCanvas").click(function(e) {
    stats.clickCount++;
    if(!started) {
      start();
    }
    if(user.clicks <= 0) return;
    var isLast = user.clicks == 1;
    $scope.$apply(function() {
      --user.clicks;
    });

    var x = e.pageX - this.offsetLeft;
    var y = e.pageY - this.offsetTop;
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
        } else {
          console.log(killing);
          console.log("len: "+ants.length);
          console.log("n: "+n);
          console.log("i: "+i);
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
    } else {
      //updateStats();
    }
  });

  function killed(i, sound) {
    if(sound === null) {
    } else if(sound) {
      if(!muted) sound.play();
    } else {
      playDead();
    }
    ants.splice(i, 1);
    $scope.$apply(function() {
      user.killed();
      stats.killCount++;
      $scope.antCount = ants.length;
    });
  }

  function playDead() {
    var file = 0.7 < Math.random() ? "se/dead1.mp3" : "se/dead2.mp3";
    var snd = new Audio(file);
    if(!muted) snd.play();
  }

  var specialSound = new Audio("se/special.mp3");
  function special() {
    stats.specialCount++;
    if(!muted) specialSound.play();
    var n = Math.min(user.specialKill.value, ants.length);
    //console.log("killing by special: " + n);
    var t1 = n > user.specialKill.value > 42 ? 33 : 66;
    var t2 = Math.max(t1, 2400 - t1 * n);
    n = user.specialKill.value;
    setTimeout(function() {
      var loop = setInterval(function() {
        if(--n <= 0 || ants.length <= 0) {
          clearInterval(loop);
        }
        if(dieRandom()) {
          stats.specialCrushCount++;
        } else {
          clearInterval(loop);
        }
      }, t1);
    }, t2);
  }

  function clearCanvas(canvas) {
    canvas.width = canvas.width;
  }

  var canvas = $("#myCanvas")[0];
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
    $.each(eaters, function() {
      this.draw(context);
    });
    $.each(ants, function() {
      this.draw(context);
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
    clearInterval(drawLoop);
  }

  var eatSound1 = new Audio("se/perori1.mp3");
  var eatSound2 = new Audio("se/perori2.mp3");

  function eat() {
    setTimeout(function() {
      $.each(eaters, function() {
        this.eat();
      });
    }, 300);
  }

  function nextTurn() {
    stats.turnCount++;
    user.nextTurn(stats.turnCount);
    enemy.nextTurn(stats.turnCount);
    var added = addAnts(enemy.antsPerTurn, false);
    var context = canvas.getContext("2d");
    $.each(added, function() {
      this.draw(context);
    });
    updateAntCount();
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
    $scope.antCount = ants.length;
    summonAnteater();
    $scope.eaterCount = eaters.length;
    drawLoop = setInterval(function() {
      var shouldEaterMove = ++frame % 6 === 0;
      var shouldEaterFlip = frame % 2 === 0;
      var shouldAddAnt = antIncoming && (frame % 8 === 0);
      if(shouldAddAnt) {
        addAnt();
        updateAntCount();
      }
      $.each(eaters, function() {
        if(shouldEaterFlip) this.swapImage();
        if(shouldEaterMove) randomMove(this, user.eaterMove.value);
      });
      $.each(ants, function() {
        randomMove(this, 5);
      });
      drawObjects();
    }, 250);
  };

  $("#defense-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.defenseUpgrade++;
      var lvl = user.defenseUpgrade;
      user.defense.update(lvl);
    });
  });

  $("#eater-upgrade").click(function() {
    var m = user.eaterUpgrade % user.eaterCost;
    var newEater = m == 2;
    $scope.$apply(function() {
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
    });
    if(newEater) {
      summonAnteater().draw(canvas.getContext('2d'));
    }
  });

  $("#crush-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.crushUpgrade++;
      var lvl = user.crushUpgrade;
      user.crushRadius.update(lvl);
      user.crushKill.update(lvl);
    });
  });

  $("#special-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.specialUpgrade++;
      //var m = user.specialUpgrade % 2;
      var lvl = user.specialUpgrade;
      //  if(m === 0) {
      user.specialRate.update(lvl);
      // } else {
      user.specialKill.update(lvl);
      //}
    });
  });
});

ariApp.directive("ant", function() {
  return {
  };
});
