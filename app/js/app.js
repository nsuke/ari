'use strict';

var ariApp = angular.module('ariApp', [
    'ngRoute',
    'ariCtrls',
]);

ariApp.config(['$routeProvider',
    function($routeProvider) {
      $routeProvider.when('/game', {
        templateUrl: 'partials/ari.html',
        controller: 'AriCtrl',
      }).when('/stats', {
        templateUrl: 'partials/stats.html',
        controller: 'StatsCtrl',
      }).otherwise({
        redirectTo: '/game',
      });
    }]);
