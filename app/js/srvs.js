'use strict';

var app = angular.module('ariSrvs', []);

app.service('appData', ['sound', function(sound) {
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

  var user = new User();
  this.getUser = function() { return user; };
}]);

app.service('sound', ['$log', function($log) { var repo = {};
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


