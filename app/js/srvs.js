'use strict';

var app = angular.module('ariSrvs', []);

app.factory('Audio', function() {
  return Audio;
});
app.factory('Image', function() {
  return Image;
});
app.factory('canvas', function() {
  var canvas = angular.element("#myCanvas")[0];
  return canvas;
});

app.service('render', ['Image', 'canvas', function(Image, canvas) {
  var parent = this;
  var width = 480;
  var height = 480;
  var margin = 50;

  this.truncateCoords = function(obj) {
    var left = obj.x;
    var right = obj.x + obj.imageWidth;
    var top = obj.y;
    var bottom = obj.y + obj.imageHeight;
    if(left < 0) obj.x = 0;
    if(right > width) obj.x = width - obj.imageWidth;
    if(top < 0) obj.y = 0;
    if(bottom > height) obj.y = height - obj.imageHeight;
  };

  this.randomCoords = function() {
    return {
      x: Math.random() * (width - margin*2) + margin,
      y: Math.random() * (height - margin*2) + margin,
    };
  };

  var imageFiles = {
    'ant': 'img/ant.png',
    'antReversed': 'img/ant_r.png',
    'eater1': 'img/arikui1.png',
    'eater2': 'img/arikui2.png',
  };
  var images = {};
  this.load = function() {
    angular.forEach(imageFiles, function(v, k) {
      var img = new Image();
      img.src = v;
      images[k] = img;
      // TODO: onImageLoaded
    });
  };
  this.image = function(k) {
    return images[k];
  };

  this.clickedCoords = function(e) {
    var x = e.offsetX;
    var y = e.offsetY;
    if(typeof x == 'undefined') {
      x = e.pageX - canvas.offsetLeft;
      y = e.pageY - canvas.offsetTop;
    }
    return {
      x: x,
      y: y
    };
  };

  this.context = function() {
    return canvas.getContext('2d');
  };

  this.clearCanvas = function (canvas) {
    canvas.width = canvas.width;
  };

  this.drawCircle = function(x, y, r) {
    var context = parent.context();
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = "rgba(255, 232, 240, 0.3)";
    context.fill();
  };

  this.drawObjects = function(ants, eaters) {
    if(canvas.width != width) {
      canvas.width = width;
      canvas.height = height;
    }
    parent.clearCanvas(canvas);
    var context = canvas.getContext("2d");
    angular.forEach(eaters, function(e) {
      e.draw();
    });
    angular.forEach(ants, function(e) {
      e.draw();
    });
  };
}]);

app.factory('User', ['sound', function(sound) {
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
    this.health = 1500;
    this.clicksPerTurn = 3;
    this.clicks = this.clicksPerTurn;
    this.motivation = 0;
    this.levelupRate = 5;
    this.level = 1;

    this.skillPoint = 0;

    this.specialUpgrade = 0;
    this.specialRate = new UserStatus(0.0007, 1.0, 0.008, true);
    this.specialKill = new UserStatus(18.5, 1000, 1.5);

    this.eaterUpgrade = 0;
    this.eaterMove = new UserStatus(10, 60, 2);
    this.eaterRadius = new UserStatus(60, 80, 1);
    this.eaterRate = new UserStatus(0.4, 1.0, 0.005, true);
    this.eaterEat = new UserStatus(3, 9, 0.2);
    this.eaterCost = 1;
    this.eaterCostEarned = this.eaterCost - 1;

    this.crushUpgrade = 0;
    this.crushRadius = new UserStatus(10, 80, 2.5, true);
    this.crushKill = new UserStatus(1.0, 1000, 0.4);

    this.defenseUpgrade = 0;
    this.defense = new UserStatus(10, 1000, 10);
  };

  User.prototype.levelup = function() {
    sound.play('level');
    var nextLevel = Math.floor(Math.pow(this.level, 1.2) * 8 + 5);
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

  User.prototype.nextTurn = function(turnCount, antsCount) {
    var dmg = antsCount - this.defense.value;
    if(dmg > 0)
      this.health -= dmg;
    if(this.health <= 0) {
      this.health = 0;
      return false;
    }
    this.clicks = this.clicksPerTurn;
    return true;
  };
  return User;
}]);

app.service('game', [
    '$interval',
    '$timeout',
    '$location',
    'appData',
    'sound',
    'render',
    'User',
    'Ant',
    'Anteater',
    function(
      $interval,
      $timeout,
      $location,
      appData,
      sound,
      render,
      User,
      Ant,
      Anteater) {

  var parent = this;
  var stats = appData.getStats();
  var user = new User();
  this.user = function() { return user; };
  var eaters = [];
  var ants = [];
  this.ants = function() { return ants; };

  var maxRotate = 0.02;

  this.summonAnteater = function() {
    var coords = render.randomCoords();
    var x = coords.x;
    var y = coords.y;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    var eater = new Anteater(x, y, r);
    eaters.push(eater);
    return eater;
  };

  function addAnt() {
    var coords = render.randomCoords();
    var x = coords.x;
    var y = coords.y;
    var r = Math.random() * maxRotate - maxRotate * 0.5;
    var ant = new Ant(x, y, r);
    ants.push(ant);
    return ant;
  }
      var context = render.context();

  function dieRandom() {
    if(ants.length > 0) {
      var i = Math.floor(Math.random() * ants.length);
      ants[i].erase(context);
      killed(i);
      return true;
    } else {
      return false;
    }
  }

  this.allAntsWithin = function(centerX, centerY, radius, max) {
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
  };

  function randomMove(obj, ammount) {
    obj.x += Math.random() * ammount * 2 - ammount;
    obj.y += Math.random() * ammount * 2 - ammount;
    render.truncateCoords(obj);
  }

  var frame = 0;
  this.init = function() {
    user.specialUpgrade = 1;
    user.eaterUpgrade = 1;
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
    //parent.summonAnteater().draw();
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
      render.drawObjects(ants, eaters);
    }, 250);
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


  var eat = function(e) {
    var eater = e.centerCoords();
    e.drawRadius(user.eaterRadius.value);
    var radius = user.eaterRadius.value;
    var toBeEaten = parent.allAntsWithin(eater.x, eater.y, user.eaterRadius.value, user.eaterEat.value);
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

  var eats = function() {
    $timeout(function() {
      angular.forEach(eaters, function(e) {
        eat(e);
      });
    }, 300);
  };

  var started = false;
  this.handleClick = function(e) {
    if(!started) {
      start();
    }
    if(user.clicks <= 0) return;
    var isLast = user.clicks == 1;
    --user.clicks;

    var r = user.crushRadius.value;
    var clicked = render.clickedCoords(e);
    var x = clicked.x;
    var y =clicked.y;

    render.drawCircle(x, y, r);
    var killing = parent.allAntsWithin(x, y, r);
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

  function gameover() {
    stop();
    $location.path("/stats");
  }

  var Enemy = function() {
    this.antsPerTurn = 3;
  };

  Enemy.prototype.nextTurn = function(numTurns) {
    var n1 = 3 + Math.pow(numTurns, 1.25) * 0.08;
    //$log.log(n1);
    this.antsPerTurn = Math.floor(n1);
  };

  var enemy = new Enemy();

  function nextTurn() {
    stats.turnCount++;
    if(!user.nextTurn(stats.turnCount, ants.length)) {
      gameover();
    }
    enemy.nextTurn(stats.turnCount);
    var added = addAnts(enemy.antsPerTurn, false);
    angular.forEach(added, function(e) {
      e.draw();
    });
    //$timeout(function() {
      eats();
    //}, 1);
  }
}]);

app.factory('Drawable', ['render', function(render) {
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

  Drawable.prototype.draw = function(image) {
    var context = render.context();
    image = typeof image == 'undefined' ? this.image : image;
    if(typeof image == 'undefined') return;
    if (this.rotate) {
      context.save();
      context.rotate(this.rotate);
    }
    context.drawImage(image, this.x, this.y, this.imageWidth, this.imageHeight);
    context.restore();
  };

  Drawable.prototype.erase = function(context) {
    this.draw(this.reverseImage);
  };
  return Drawable;
}]);

app.factory('Ant', ['Drawable', 'render', function(Drawable, render) {
  var antWidth = 18.0;
  var antHeight = 25.0;
  var Ant = function(x, y, rotate) {
    Drawable.call(this, x, y, rotate);
    this.image = render.image('ant');
    this.reverseImage = render.image('antReversed');
    this.imageWidth = 18.0;
    this.imageHeight = 25.0;
  };
  Ant.prototype = new Drawable();
  Ant.prototype.withinArea = function(x, y) {
    return this.x <= x && this.x + antWidth >= x && this.y <= y && this.y + antHeight >= y;
  };
  return Ant;
}]);

app.factory('Anteater', ['Drawable', 'render', 'sound', function(Drawable, render, sound) {
  var img1;
  var img2;
  var Anteater = function(x, y, rotate) {
    img1 = render.image('eater1');
    img2 = render.image('eater2');
    Drawable.call(this, x, y, rotate);
    this.image = img2;
    this.imageWidth = 40;
    this.imageHeight = 40;
  };
  Anteater.prototype = new Drawable();
  Anteater.prototype.drawRadius = function(r) {
    var center = this.centerCoords();
    render.drawCircle(center.x, center.y, r);
  };
  Anteater.prototype.swapImage = function() {
    this.image = this.image == img2 ? img1 : img2;
  };
  return Anteater;
}]);

app.service('appData', [function() {
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
  this.getStats = function() { return stats; };

}]);

app.service('sound', ['Audio', function(Audio) { var repo = {};
  var muted = false;
  var volume = 1.0;

  this.updateVolume = function(v) {
    for (var k in repo) {
      for(var k2 in repo[k]) {
        repo[k][k2].volume = v;
      }
    }
  };

  this.play = function(key) {
    if(!muted) {
      var snds = repo[key];
      if(snds) {
        var n = snds.length;
        while(--n >= 0) {
          var snd = snds[n];
          if(snd.ended || snd.currentTime === 0) {
            snd.play();
            return;
          }
        }
        //$log.log("not enough: "+key);
      }
    }
  };

  var parent = this;
  var SoundState = function(icon, volume, muted) {
    this.iconClass = 'glyphicon glyphicon-volume-' + icon;
    this.volume = volume;
    this.muted = typeof muted == 'undefined' ? false : muted;
    var next;
    this.nextState = function(s) {
      if(typeof s == 'undefined') {
        return next;
      } else {
        next = s;
        return next;
      }
    };
    this.apply = function() {
      muted = this.muted;
      parent.updateVolume(this.volume);
    };
  };
  var stateDown = new SoundState('down', 0.3);
  var stateUp = new SoundState('up', 1.0);
  var stateOff = new SoundState('off', 0, true);
  stateDown.nextState(stateUp);
  stateUp.nextState(stateOff);
  stateOff.nextState(stateDown);

  var soundState = stateDown;

  this.volumeToggle = function() {
    soundState = soundState.nextState();
    soundState.apply();
  };

  this.getSoundIconClass = function() {
    return soundState.iconClass;
  };

  this.load = function() {
    var m = {
      'level': ["se/level.mp3", 8],
      'special': ["se/special.mp3", 8],
      'eat1': ["se/perori1.mp3", 4],
      'eat2': ["se/perori2.mp3", 4],
      'dead1': ["se/dead1.mp3", 8],
      'dead2': ["se/dead2.mp3", 8],
    };
    for(var k in m) {
      var v = m[k];
      var acc = [];
      var n = v[1];
      while(--n >= 0) {
        acc.push(new Audio(v[0]));
      }
      repo[k] = acc;
    }
    soundState.apply();
  };
}]);