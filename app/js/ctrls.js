'use strict';

var app = angular.module('ariCtrls', []);

app.controller('StatsCtrl', [
    '$scope',
    '$location',
    'game',
    function($scope, $location, game) {
      var redirect = true;
      if(game && game.user && game.user().stats) {
        $scope.stats = game.user().stats;
        if(game.user().stats.turnCount) {
          redirect = false;
        }
      }
      if(redirect) {
        $location.path('/game');
      }
    }]);

app.controller('AriCtrl', [
    '$scope',
    'sound',
    'render',
    'ants',
    'game',
    function(
      $scope,
      sound,
      render,
      ants,
      game) {

  var user = game.user();
  $scope.user = user;
  var stats = user.stats;
  $scope.stats = stats;

  render.load();
  sound.load();

  var started = false;
  var mousePressed = false;
  $scope.canvasMouseDown = function(e) {
    mousePressed = true;
    updateCursorStyle(e.clientX, e.clientY, mousePressed);
  };
  $scope.canvasMouseUp = function(e) {
    mousePressed = false;
    updateCursorStyle(e.clientX, e.clientY, mousePressed);
  };
  var updateCursorStyle = function(x, y, pressed) {
    $scope.cursorStyle = {
      pointerEvents: 'none',
      position: 'fixed',
      left: x - (pressed ? customCursor.pressedOffsetX : customCursor.offsetX),
      top: y - (pressed ? customCursor.pressedOffsetX : customCursor.offsetY),
    };
  };
  $scope.updateCursorStyle = function(e) {
    updateCursorStyle(e.clientX, e.clientY, mousePressed);
  };
  var handCursor = {
    url: "img/hand160.png",
    pressedOffsetX: 80,
    pressedOffsetY: 80,
    offsetX: 80,
    offsetY: 80,
  };
  var fingerCursor = {
    url: "img/finger.png",
    pressedOffsetX: 2,
    pressedOffsetY: 10,
    offsetX: -2,
    offsetY: -10,
  };
  var customCursor;
  var setCustomCursor = function(cur) {
    if(customCursor != cur) {
      customCursor = cur;
      updateCursorStyle(-8000, -8000);
    }
  };
  var enableHand = function(v) {
    if(typeof v == 'undefined') v = true;
    if(v) {
      user.activateSkill(true);
    }
    setCustomCursor(v ? handCursor : fingerCursor);
  };
  $scope.enableHand = enableHand;
  enableHand(false);

  $scope.popup = function() {
    return game.started() ? "hide" : "popup";
  };

  $scope.content = function() {
    return game.started() ? "content" : "disabled content";
  };

  $scope.setDifficulty = function(difficulty) {
    game.start(difficulty);
  };

  $scope.eaterCount = 0;

  $scope.skillPointStyle = function() {
    return user.skillPoint > 0 ? "btn btn-danger" : "btn btn-primary";
  };

  $scope.ants = ants;

  var context = render.context();
  $scope.canvasClick = function(e) {
    stats.clickCount++;
    game.handleClick(e);
    enableHand(false);
  };

  $scope.init = function() {
    game.init();
  };

  $scope.defenseUpgrade = function() {
    user.skillPoint--;
    user.defenseUpgrade++;
    var lvl = user.defenseUpgrade;
    user.defense.update(lvl);
  };

  $scope.eaterUpgrade = function() {
    var newEater = user.eaterCost === ++user.eaterCostEarned;
    user.skillPoint--;
    user.eaterUpgrade++;
    if(newEater) {
      user.eaterCostEarned = 0;
      ++user.eaterCost;
      $scope.eaterCount++;
    }
    var lvl = user.eaterUpgrade;
    user.eaterMove.update(lvl);
    user.eaterRadius.update(lvl);
    user.eaterEat.update(lvl);
    user.eaterRate.update(lvl);
    if(newEater) {
      game.summonAnteater().draw();
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

  $scope.volumeToggle = function() {
    sound.volumeToggle();
  };

  $scope.volumeStyle = function() {
    return sound.getSoundIconClass();
  };
}]);

app.directive("ant", function() {
  return {
  };
});
