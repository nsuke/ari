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

  $scope.eaterCount = 0;

  $scope.skillPointStyle = function() {
    return user.skillPoint > 0 ? "btn btn-danger" : "btn btn-primary";
  };

  $scope.ants = ants;

  var context = render.context();
  $scope.canvasClick = function(e) {
    stats.clickCount++;
    game.handleClick(e);
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
