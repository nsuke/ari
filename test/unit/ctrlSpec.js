/*global beforeEach, afterEach, describe, expect, it, spyOn, xdescribe, xit, module, inject*/
'use strict';

describe('ari controllers', function() {
  beforeEach(module('ariApp'));

  describe('AriCtrl', function() {
    var scope;
    var sound;
    var ctrl;
    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      sound = {
        load: function() { },
        play: function() { },
        volumeToggle: function() { },
        getSoundIconClass: function() { },
      };

      ctrl = $controller('AriCtrl', {
        $scope: scope,
        sound: sound
      });
    }));

    it('should load successfully', function() {
      expect(true).toBe(true);
    });
  });

  describe('StatsCtrl', function() {
    var scope;
    var location;
    var ctrl;
    beforeEach(inject(function($rootScope, $controller, $location) {
      scope = $rootScope.$new();
      location = $location;
      ctrl = $controller('StatsCtrl', {
        $scope: scope,
        $location: location,
      });
    }));
    it('should load successfully', function() {
      expect(true).toBe(true);
    });
    it('should redirect to game page', function() {
      expect(location.path()).toBe('/game');
    });
  });
});
