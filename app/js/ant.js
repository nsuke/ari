'use strict';

var ariApp = angular.module('ariApp', []);
ariApp.controller('AriCtrl', function($scope) {
  $scope.stats = stats;

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

  function summonAnteater() {
    var x = Math.random() * (width - margin*2) + margin;
    var y = Math.random() * (height - margin*2) + margin;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    eaters.push(new Anteater(x, y, r));
  }

  var started = false;

  var Enemy = function() {
    this.antsPerTurn = 3;
  };

  Enemy.prototype.nextTurn = function(numTurns) {
    this.antsPerTurn = Math.floor(Math.max(3 + Math.pow(numTurns, 1.3) * 0.05), this.numTurns * 0.3);
    console.log("ants per turn: " + this.antsPerTurn);
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
    this.specialKill = new UserStatus(14, 1000, 1.5);

    this.eaterUpgrade = 0;
    this.eaterMove = new UserStatus(9, 50, 1);
    this.eaterRadius = new UserStatus(30, 60, 1.5);
    this.eaterEat = new UserStatus(1, 3, 0.05);

    this.crushUpgrade = 0;
    this.crushRadius = new UserStatus(9, 48, 3);
    this.crushKill = new UserStatus(0.5, 1000, 0.5);

    this.defenseUpgrade = 0;
    this.defense = new UserStatus(0, 1000, 16);
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
    var nextLevel = Math.pow((this.level - 1), 1.1) * 8 + 5;
    console.log("next level: " + nextLevel);
    this.levelupRate = this.levelupRate + nextLevel;
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
      this.health -= ants.length;
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
          console.log("eat max: " + max);
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
    var n = toBeEaten.length;
    //var context = canvas.getContext("2d");
    if(n > 0) {
      var snd = Math.random() > 0.8 ? eatSound2 : eatSound1;
      snd.play();
    }
    while(n > 0 && ants.length > 0) {
      var i = toBeEaten[--n];
      //ants[i].erase(context);
      if(Math.random() < 0.9) {
        killed(i, null);
        stats.eatCount++;
      }
    }
  };

  function updateStats() {
    //  $("#health").text("健康: "+user.health);
    //  $("#click-count").text("あと "+user.clicks+"クリック！");
    //  $("#kill-count").text("現在の本気："+user.motivation+"");
    //  $("#skill-point").text("スキルポイント："+user.skillPoint+"");
    //  $("#level").text("レベル："+user.level+"");
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
    //$("#ant-count").text("今のアリの数：　"+ants.length);
    //$scope.$digest();
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

    var killing = allAntsWithin(x, y, user.crushRadius.value);
    killing.sort();
    var n = Math.min(killing.length, user.crushKill.value);
    if(n > 0) {
      var context = canvas.getContext("2d");
      while(n > 0) {
        stats.crushCount++;
        var i = killing[--n];
        var ant = ants[i];
        if(ant) {
          ant.erase(context);
        }
        killed(i);
      }
      if(Math.random() < user.specialRate.value) {
        special();
      }
      //drawObjects();
    } else {
      stats.missCount++;
    }

    if(user.clicks === 0) {
      nextTurn();
    }
    updateStats();
  });

  function killed(i, sound) {
    if(sound === null) {
    } else if(sound) {
      sound.play();
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
    var file = 0.7 < Math.random() ? "se/dead1.wav" : "se/dead2.wav";
    var snd = new Audio(file);
    snd.play();
  }

  var specialSound = new Audio("se/special.wav");
  function special() {
    stats.specialCount++;
    specialSound.play();
    var n = Math.min(user.specialKill.value, ants.length);
    console.log("killing by special: " + n);
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

  var eatSound1 = new Audio("se/perori1.wav");
  var eatSound2 = new Audio("se/perori2.wav");

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
    //drawObjects();
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
    //this.specialUpgrade = 1;
    //this.specialRate = new UserStatus(0.0, 1.0, 0.01, true);
    //this.specialKill = new UserStatus(18, 1000, 2);

    //this.eaterUpgrade = 1;
    //this.eaterMove = new UserStatus(8, 48, 1);
    //this.eaterRadius = new UserStatus(50, 100, 1.5);
    //this.eaterEat = new UserStatus(1, 3, 0.05);

    //this.crushUpgrade = 1;
    //this.crushRadius = new UserStatus(9, 50, 3);
    //this.crushKill = new UserStatus(0.5, 16, 0.5);

    //this.defenseUpgrade = 1;
    //this.defense = new UserStatus(0, 1000, 16);
    user.specialUpgrade = 3;
    user.eaterUpgrade = 3;
    user.crushUpgrade = 2;
    user.defenseUpgrade = 2;
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
    //summonAnteater();
    drawLoop = setInterval(function() {
      var shouldEaterMove = ++frame % 6 === 0;
      var shouldEaterFlip = frame % 2 === 0;
      var shouldAddAnt = antIncoming && (frame % 8 === 0);
      if(shouldAddAnt) {
        addAnt();
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
    });
    var lvl = user.defenseUpgrade;
    user.defense.update(lvl);
  });

  $("#eater-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.eaterUpgrade++;
    });
    var m = user.eaterUpgrade % 3;
    if(m == 1) {
      summonAnteater();
      drawObjects();
    } else {
      var lvl = user.eaterUpgrade;
      user.eaterMove.update(lvl);
      user.eaterRadius.update(lvl);
      user.eaterEat.update(lvl);
      console.log("eater eat: " + user.eaterEat.value);
    }
  });

  $("#crush-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.crushUpgrade++;
    });
    var lvl = user.crushUpgrade;
    user.crushRadius.update(lvl);
    user.crushKill.update(lvl);
  });

  $("#special-upgrade").click(function() {
    $scope.$apply(function() {
      user.skillPoint--;
      user.specialUpgrade++;
    });
    var m = user.specialUpgrade % 2;
    var lvl = user.specialUpgrade;
    if(m === 0) {
      user.specialRate.update(lvl);
    } else {
      user.specialKill.update(lvl);
    }
  });
});

ariApp.directive("ant", function() {
  return {
  };
});
