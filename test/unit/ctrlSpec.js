/*global beforeEach, afterEach, describe, expect, it, spyOn, xdescribe, xit, module, inject*/
'use strict';

describe('ari controllers', function() {
  beforeEach(module('ariApp', function($provide) {
    var sound = {
      load: function() { },
      play: function() { },
      volumeToggle: function() { },
      getSoundIconClass: function() { },
    };
    var canvas = {
      getContext: function() { }
    };
    $provide.value('Audio', function(){});
    $provide.value('Image', function(){});
    $provide.value('sound', sound);
    $provide.value('canvas', canvas);
  }));

  describe('AriCtrl', function() {
    var scope;
    var ctrl;
    beforeEach(inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      ctrl = $controller('AriCtrl', {
        $scope: scope,

      });
    }));

    it('should construct', function() {
      expect(typeof ctrl).not.toBe('undefined');
      expect(ctrl).toBeDefined();
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
      expect(ctrl).toBeDefined();
    });

    it('should assign stats to its scope', function() {
      expect('stats' in scope).toBe(true);
      expect('turnCount' in scope.stats).toBe(true);
    });

    it('should redirect to game page', function() {
      expect(location.path()).toBe('/game');
    });
  });
});
