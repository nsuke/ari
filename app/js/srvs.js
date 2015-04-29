'use strict';

var app = angular.module('ariSrvs', []);

app.factory('Audio', function() {
  return Audio;
});
app.factory('Image', function() {
  return Image;
});

app.service('render', ['Image', function(Image) {
  var parent = this;
  var canvas;
  var width = 480;
  var height = 480;
  this.width = function() { return width; };
  this.height = function() { return height; };

  this.truncateCoords = function(x, y, w, h) {
    if (isNaN(x + y + w + h)) {
      throw new Error('Invalid argument for truncateCoords');
    }
    var r = 0.25 * (w + h);
    var maxX = width - r;
    var maxY = height - r;
    var obj = {};
    if (y < r || y > maxY) {
      obj.edgeAngle = Math.PI;
    }
    if (x < r || x > maxX) {
      obj.edgeAngle = Math.PI / 2;
    }
    obj.x = Math.max(Math.min(x, maxX), r);
    obj.y = Math.max(Math.min(y, maxY), r);
    if (isNaN(obj.x + obj.y)) {
      throw new Error('Failed to truncate coords');
    }
    return obj;
  };

  this.randomCoords = function(margin) {
    margin = typeof margin == 'undefined' ? 0 : margin;
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
    canvas = angular.element("#myCanvas")[0];
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
    if(canvas) {
      return canvas.getContext('2d');
    }
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

  this.drawObjects = function(ants, eaters, circleEffects) {
    if(canvas.width != width) {
      canvas.width = width;
      canvas.height = height;
    }
    parent.clearCanvas(canvas);
    var context = canvas.getContext("2d");
    eaters.draw();
    ants.draw();
    circleEffects.draw();
  };
}]);

app.factory('UserStatus', ['sound', function(sound) {
  var UserStatus = function(initValue, maxValue, step, floating) {
    this.floating = floating;
    this.initValue = initValue;
    this.maxValue = maxValue;
    this.step = step;
    this.value = initValue;
  };

  UserStatus.prototype.update = function(level) {
    var v = Math.min(
          this.maxValue, this.initValue + this.step * level);
    this.value = this.floating ? v : Math.floor(v);
  };
  return UserStatus;
}]);

app.factory('DiminishingUserStatus', [function() {
  var DiminishingUserStatus = function(init, max, rate) {
    this.floating = true;
    this.initValue = init;
    this.maxValue = max;
    this.step = 1.0 - rate;
    this.value = init;
    this.level = 0;
  };
  DiminishingUserStatus.prototype.update = function(level) {
    var n = level - this.level;
    var cur = this.value;
    while(n-- > 0) {
      cur = this.maxValue - (this.maxValue - cur) * this.step;
    }
    this.level = level;
    this.value = cur;
  };
  return DiminishingUserStatus;
}]);

app.service('Difficulty', [function() {
  var hard = {
    health: 1500,
    antRate: 0.0015,
  };

  var normal = {
    health: 2000,
    antRate: 0.0008,
  };

  var easy = {
    health: 2500,
    antRate: 0.0007,
  };

  this.hard = function() { return hard; };
  this.normal = function() { return normal; };
  this.easy = function() { return easy; };
}]);

app.factory('User', ['UserStatus', 'DiminishingUserStatus', 'sound', function(UserStatus, DiminishingUserStatus, sound) {
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

  var User = function() {
    this.stats = stats;
    this.health = 1500;
    this.clicksPerTurn = 3;
    this.clicks = this.clicksPerTurn;
    this.motivation = 0;
    this.experience = 0;
    this.nextLevel = 5;
    this.level = 1;

    this.skillPoint = 0;

    this.specialUpgrade = 0;
    this.specialRate = new DiminishingUserStatus(0.0007, 0.9, 0.008);
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

    this.activeSkill = null;
    this.skillGaugeMaxNext = 8;
    this.skillGaugeMax = 8;
    this.skillGaugeValue = 0;
    this.skillAvailable = false;
  };

  User.prototype.difficulty = function(difficulty) {
    this.health = difficulty.health;
  };

  User.prototype.init = function() {
    this.specialUpgrade = 1;
    this.eaterUpgrade = 1;
    this.crushUpgrade = 1;
    this.defenseUpgrade = 1;
    this.specialRate.update(this.specialUpgrade);
    this.specialKill.update(this.specialUpgrade);
    this.eaterMove.update(this.eaterUpgrade);
    this.eaterRadius.update(this.eaterUpgrade);
    this.eaterEat.update(this.eaterUpgrade);
    this.crushRadius.update(this.crushUpgrade);
    this.crushKill.update(this.crushUpgrade);
    this.defense.update(this.defenseUpgrade);
  };

  User.prototype.levelup = function() {
    sound.play('level');
    this.experience = 0;
    this.nextLevel = Math.floor(Math.pow(this.level, 1+this.level*0.008) * 8 + 5);
    this.level++;
    this.skillPoint += 2;
  };

  User.prototype.activateSkill = function(v) {
    this.activeSkill = v;
    if(v) {
      this.skillAvailable = false;
      this.skillGaugeValue = 0;
      this.skillGaugeMax = Math.max(8, this.skillGaugeMaxNext);
    }
  };

  User.prototype.killed = function() {
    this.motivation++;
    this.experience++;
    if(this.experience >= this.nextLevel) {
      this.levelup();
    }
    if(!this.activeSkill) {
      this.skillGaugeValue = Math.min(this.skillGaugeMax, this.skillGaugeValue + 1);
      if(this.skillGaugeValue >= this.skillGaugeMax) {
        this.skillAvailable = true;
      }
    }
  };

  User.prototype.nextTurn = function(antsCount) {
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

app.service('ants', ['Ant', 'render', 'sound',
  function(Ant, render, sound) {

  var maxRotate = Math.PI;
  var parent = this;
  var ants = [];
  var corpses = [];

  this.count = function() {
    return ants.length;
  };

  this.draw = function() {
    angular.forEach(ants, function(e) {
      e.draw();
    });
    for (var i = corpses.length - 1; i >= 0; --i) {
      var e = corpses[i];
      if (e.drawDead()) {
        corpses.splice(i, 1);
      }
    }
  };

  this.add = function(x, y, r) {
    if(typeof x == 'undefined') {
      var coords = render.randomCoords(50);
      x = coords.x;
      y = coords.y;
    }
    r = typeof r == 'undefined' ? Math.random() * Math.PI * 2 : r;
    var ant = new Ant(x, y, r);
    ants.push(ant);
    return ant;
  };

  this.addAnts = function(n, redraw) {
    var added = [];
    while (n--) { added.push(parent.add()); }
    return added;
  };

  this.pickRandom = function() {
    if(ants.length > 0) {
      var i = Math.floor(Math.random() * ants.length);
      //killed(i);
      return i;
    } else {
      return -1;
    }
  };

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

  this.die = function(i, snd) {
    var ant = ants[i];
    corpses.push(ant);
    if(snd === null) {
    } else if(snd) {
      sound.play(snd);
    } else {
      sound.play(Math.random() > 0.7 ? 'dead1' : 'dead2');
    }
    ants.splice(i, 1);
  };

  this.randomMove = function() {
    angular.forEach(ants, function(ant) {
      ant.randomMove();
    });
  };
}]);

app.service('eaters', ['Anteater', 'render',
  function(Anteater, render) {
  var parent = this;
  var eaters = [];
  var maxRotate = 0.02;

  this.summon = function() {
    var coords = render.randomCoords(50);
    var r = Math.random() * Math.PI * 2;
    var eater = new Anteater(coords.x, coords.y, r);
    eaters.push(eater);
    return eater;
  };

  this.randomMove = function(amount) {
      angular.forEach(eaters, function(eater) {
        eater.randomMove(amount);
      });
  };

  this.draw = function() {
    angular.forEach(eaters, function(eater) {
      eater.draw();
    });
  };

  this.get = function() {
    return eaters;
  };
}]);

app.service('circleEffects', ['CircleEffect', 'render',
            function(CircleEffect, render) {
  var effects = [];

  this.add = function(x, y, r) {
    effects.push(new CircleEffect(x, y, r));
  };

  this.draw = function() {
    for (var i = effects.length - 1; i >= 0; --i) {
      const e = effects[i];
      e.draw();
      if (e.done) {
        effects.splice(i, 1);
      }
    }
  };

  this.get = function() {
    return effects;
  };
}]);

app.service('user', ['User', function(User) {
  var user = new User();
  return user;
}]);


app.service('game', [
    '$interval',
    '$timeout',
    '$location',
    'sound',
    'render',
    'user',
    'Ant',
    'Anteater',
    'ants',
    'eaters',
    'circleEffects',
    'Difficulty',
    function(
      $interval,
      $timeout,
      $location,
      sound,
      render,
      user,
      Ant,
      Anteater,
      ants,
      eaters,
      circleEffects,
      Difficulty) {

  var parent = this;
  this.user = function() { return user; };
  var stats = user.stats;

  this.summonAnteater = function() {
    return eaters.summon();
  };

  function killRandom() {
    var i = ants.pickRandom();
    if(i >= 0) {
      killed(i);
      return true;
    }
    return false;
  }

  var drawFrame = 0;
  var gameFrame = 0;
  var handleGameFrame = function(gameFrame) {
    var shouldAddAnt = antIncoming && (gameFrame % 8 === 0);
    if(shouldAddAnt) {
      ants.add();
    }
    eaters.randomMove();
  };
  this.init = function() {
    user.init();
    ants.addAnts(5);
    parent.summonAnteater().draw();
    drawLoop = $interval(function() {
      ++drawFrame;
      if (drawFrame % 6 == 0) {
        handleGameFrame(++gameFrame);
      }
      ants.randomMove();
      render.drawObjects(ants, eaters, circleEffects);
    }, 33);
  };
  function killed(i, snd) {
    ants.die(i, snd);
    user.killed();
    stats.killCount++;
  }

  var antIncoming = false;
  var drawLoop;
  var difficulty;
  var easymode = false;
  this.start = function(_difficulty_) {
    switch(_difficulty_) {
      case 'hard':
        difficulty = Difficulty.hard();
        break;
      case 'normal':
        difficulty = Difficulty.normal();
        break;
      case 'easy':
        easymode = true;
        difficulty = Difficulty.easy();
        break;
    }
    user.difficulty(difficulty);
    antIncoming = true;
    started = true;
  };

  function stop() {
    antIncoming = false;
    $interval.cancel(drawLoop);
  }

  function special() {
    stats.specialCount++;
    sound.play('special');
    var n = Math.min(user.specialKill.value, ants.count());
    var t1 = n > user.specialKill.value > 42 ? 33 : 66;
    var t2 = Math.max(t1, 2400 - t1 * n);
    n = user.specialKill.value;
    $timeout(function() {
      var loop = $interval(function() {
        if(--n <= 0 || ants.count() <= 0) {
          $interval.cancel(loop);
        }
        if(killRandom()) {
          stats.specialCrushCount++;
        } else {
          //$interval.cancel(loop);
        }
      }, t1);
    }, t2);
  }

  var eat = function(e) {
    var eater = e.centerCoords();
    circleEffects.add(eater.x, eater.y, user.eaterRadius.value);
    var radius = user.eaterRadius.value;
    var toBeEaten = ants.allAntsWithin(eater.x, eater.y, user.eaterRadius.value, user.eaterEat.value);
    toBeEaten.sort(function(a, b) { return a - b; });
    var n = toBeEaten.length;
    if(n > 0) {
      sound.play(Math.random() > 0.8 ? 'eat2' : 'eat1');
    }
    while(n > 0 && ants.count() > 0) {
      var i = toBeEaten[--n];
      if(Math.random() < user.eaterRate.value) {
        killed(i, null);
        stats.eatCount++;
      }
    }
  };

  var eats = function() {
    $timeout(function() {
      angular.forEach(eaters.get(), function(e) {
        eat(e);
      });
    }, 300);
  };

  var started = false;
  this.started = function() {
    return started;
  };
  this.handleClick = function(e) {
    if(user.clicks <= 0) return;
    var isLast = user.clicks == 1;

    var r = user.crushRadius.value + (user.activeSkill ? 60 : 0);
    var maxKill = user.activeSkill ? 1000 : user.crushKill.value;
    var clicked = render.clickedCoords(e);
    var x = clicked.x;
    var y =clicked.y;

    circleEffects.add(x, y, r);
    var killing = ants.allAntsWithin(x, y, r);
    killing.sort(function(a, b) { return a - b; });
    var n = Math.min(killing.length, Math.max(1, maxKill));
    if(n > 0) {
      --user.clicks;
      while(n > 0 && ants.count() > 0) {
        var i = killing[--n];
        var ant = ants[i];
        if(ant) {
          ant.erase();
        }
        killed(i);
        stats.crushCount++;
      }
      if(Math.random() < user.specialRate.value) {
        special();
      }
    } else {
      if(!easymode) --user.clicks;
      stats.missCount++;
    }
    user.activeSkill = null;

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

  Enemy.prototype.nextTurn = function(numTurns, difficulty) {
    var rate = difficulty.antRate;
    var n1 = 3 + Math.pow(numTurns, 1 + numTurns * rate) * 0.1;
    this.antsPerTurn = Math.floor(n1);
    user.skillGaugeMaxNext = this.antsPerTurn * 3;
  };

  var enemy = new Enemy();

  function nextTurn() {
    stats.turnCount++;
    if(!user.nextTurn(ants.count())) {
      gameover();
    }
    enemy.nextTurn(stats.turnCount, difficulty);
    var added = ants.addAnts(enemy.antsPerTurn, false);
    angular.forEach(added, function(e) {
      e.draw();
    });
    eats();
  }
}]);

app.factory('Drawable', ['render', function(render) {

  var Drawable = function(x, y, r, width, height, imageRotation) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.imageRotation = imageRotation;
    this.width = width;
    this.height = height;
    this.halfWidth = width * 0.5;
    this.halfHeight = height * 0.5;
  };

  Drawable.prototype.draw = function(image) {
    if (isNaN(this.x) || isNaN(this.y)) {
      return;
    }
    if (typeof image == 'undefined') {
      image = this.image;
    }
    var context = render.context();
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.r + this.imageRotation);
    if (!this.flipVertical) {
      context.translate(-this.halfWidth, -this.halfHeight);
    } else {
      context.translate(-this.halfWidth, this.halfHeight);
      context.transform(1, 0, 0, -1, 0, 0);
    }
    context.drawImage(image, 0, 0, this.width, this.height);
    context.restore();
  };
  return Drawable;
}]);

app.factory('Creature', ['render', 'Drawable', function(render, Drawable) {
  var Creature = function(x, y, r, width, height, imageRotation) {
    Drawable.call(this, x, y, r, width, height, imageRotation);
    this.maxDs = Math.PI * 0.01;
    this.dr = Math.random() * (this.maxDr - this.minDr) + this.minDr;
    this.ds = 0.0;
    this.baseAcceleration = 0.02;
    this.baseRotateAcceleration = Math.PI * 0.006;
  };

  Creature.prototype = Object.create(Drawable.prototype);

  Creature.prototype.transform = function(m) {
  };

  Creature.prototype.centerCoords = function() {
    return { x: this.x, y: this.y };
  };

  Creature.prototype.capVelocity = function(dr) {
    return Math.min(Math.max(dr, this.minDr), this.maxDr);
  }

  Creature.prototype.capAngleVelocity = function(ds) {
    return Math.min(Math.max(ds, -this.maxDs), this.maxDs);
  }

  Creature.prototype.updateVelocity = function(ar, as) {
    this.dr = this.capVelocity(this.dr + ar);
    this.ds = this.capAngleVelocity(this.ds + as);
  };

  Creature.prototype.fmod = function(num, base) {
    if (isNaN(num)) throw new Error('argument is NaN');
    if (num >= 0 && num < base) {
      return num;
    } else {
      return this.fmod(num + (num >= 0 ? -base : base), base);
    }
  };

  Creature.prototype.updateLocation = function() {
    if (isNaN(this.x)) return;
    this.r = this.fmod(this.r + this.ds, Math.PI * 2);
    var theta = this.r;
    var dx = this.dr * Math.cos(theta);
    if (isNaN(dx)) throw new Error('hoge');
    var dy = this.dr * Math.sin(theta);
    this.x += dx;
    if (isNaN(this.x)) throw new Error('hoge');
    this.y += dy;
    var truncated = render.truncateCoords(this.x, this.y, this.width, this.height);
    this.x = truncated.x;
    this.y = truncated.y;
    // var edgeAngle = render.truncateCoords(this);
    if (isNaN(this.x)) throw new Error('hoge');
    if (truncated.edgeAngle) {
      if (Math.random() < 0.05) {
        this.dr = 0;
        this.r = this.fmod(2 * truncated.edgeAngle - this.r, Math.PI * 2);
      }
    }
  };

  Creature.prototype.randomMove = function() {
    var baseR = this.baseAcceleration;
    var baseS = this.baseRotateAcceleration;
    var ar = Math.random() * baseR * 2 - baseR;
    var as = Math.random() * baseS * 2 - baseS;
    this.updateVelocity(ar, as);
    this.updateLocation();
  };

  return Creature;
}]);

app.factory('Ant', ['Drawable', 'Creature', 'render', function(Drawable, Creature, render) {
  const antWidth = 18.0;
  const antHeight = 25.0;
  var Ant = function(x, y, r) {
    this.minDr = 1;
    this.maxDr = 2;
    Creature.call(this, x, y, r, 18.0, 25.0, Math.PI * 1.5);
    this.image = render.image('ant');
    this.reverseImage = render.image('antReversed');
    this.deadFrames = 0;
  };

  Ant.prototype = Object.create(Creature.prototype);
  Ant.prototype.withinArea = function(x, y) {
    return this.x <= x && this.x + antWidth >= x && this.y <= y && this.y + antHeight >= y;
  };

  const deadEffectFrames = 4;
  Ant.prototype.drawDead = function() {
    this.draw();
    this.draw(this.reverseImage);
    return ++this.deadFrames >= deadEffectFrames;
  };

  return Ant;
}]);

app.factory('Anteater', ['Drawable', 'Creature', 'render', 'sound', 'user', function(Drawable, Creature, render, sound, user) {
  const alternateFrames = 30;
  var img1;
  var img2;
  var Anteater = function(x, y, r) {
    Creature.call(this, x, y, r, 40, 40, Math.PI);
    this.flipVertical = true;
    if (!img1) {
      img1 = render.image('eater1');
    }
    if (!img2) {
      img2 = render.image('eater2');
    }
    this.image = img2;
    this.alternateCount = 0;
    this.draw = function() {
      if (++this.alternateCount >= alternateFrames) {
        this.alternateCount = 0;
        this.image = this.image == img2 ? img1 : img2;
      }
      this.r = this.fmod(this.r, Math.PI * 2);
      this.flipVertical = this.r < Math.PI * 0.5 || this.r > Math.PI * 1.5;
      Anteater.prototype.draw.call(this, this.image);
    };
  };
  Anteater.prototype = Object.create(Creature.prototype);
  Object.defineProperties(Anteater.prototype, {
    maxDr: {
      get: function() { return user.eaterMove.value * 2; }
    },
    minDr: {
      get: function() { return user.eaterMove.value; }
    },
  });
  return Anteater;
}]);

app.factory('CircleEffect', ['render', function(render) {
  const renderCountToStay = 6;
  var CircleEffect = function(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.renderCount = 0;
    this.done = false;
  };
  CircleEffect.prototype.draw = function() {
    render.drawCircle(this.x, this.y, this.r);
    if (++this.renderCount > renderCountToStay) {
      this.done = true;
    }
  };
  return CircleEffect;
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
