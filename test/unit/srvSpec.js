/*global beforeEach, afterEach, describe, expect, it, spyOn, xdescribe, xit, module, inject*/
'use strict';

describe('ari services', function() {
  beforeEach(module('ariApp', function($provide) {
    $provide.value('Audio', function(){});
    $provide.value('Image', function(){});
  }));

  describe('render', function() {
    var render;
    beforeEach(inject(function(_render_) {
      render = _render_;
    }));

    it('should construct', function() {
      expect(render).toBeDefined();
    });

    it('should truncate coordinates', function() {
      var imgWidth = 33.3;
      var imgHeight = 33.3;
      var maxWidth = render.width() - imgWidth;
      var maxHeight = render.height() - imgHeight;
      var obj = {
        imageWidth: imgWidth,
        imageHeight: imgHeight
      };

      obj.x = 30000;
      obj.y = 53424;
      render.truncateCoords(obj);
      expect(obj.x).toBe(maxWidth);
      expect(obj.y).toBe(maxHeight);

      obj.x = -239487;
      obj.y = -874;
      render.truncateCoords(obj);
      expect(obj.x).toBe(0);
      expect(obj.y).toBe(0);

      obj.x = maxWidth - 8;
      obj.y = maxWidth - 11;
      render.truncateCoords(obj);
      expect(obj.x).toBe(maxWidth - 8);
      expect(obj.y).toBe(maxHeight - 11);
    });

    it('should create random coordinates', function() {
      var w = render.width();
      var h = render.height();

      var coords = [
        render.randomCoords(),
        render.randomCoords(),
        render.randomCoords()
      ];
      angular.forEach(coords, function(v) {
        expect(v.x).toBeLessThan(w+0.1);
        expect(v.x).toBeGreaterThan(0-0.1);
        expect(v.y).toBeLessThan(h+0.1);
        expect(v.y).toBeGreaterThan(0-0.1);
      });

      var coord = render.randomCoords(w / 2);
      expect(coord.x).toBe(w / 2);

      coord = render.randomCoords(h / 2);
      expect(coord.y).toBe(h / 2);
    });

    it('should load images', function() {
      render.load();
      expect(render.image('ant')).toBeDefined();
      expect(render.image('antReversed')).toBeDefined();
      expect(render.image('eater1')).toBeDefined();
      expect(render.image('eater2')).toBeDefined();
      expect(render.image('invalid')).not.toBeDefined();
    });
  });

  describe('UserStatus', function() {
    var UserStatus;
    beforeEach(inject(function(_UserStatus_) {
      UserStatus = _UserStatus_;
    }));

    it('should update its value', function() {
      var u = new UserStatus(42, 150, 8);
      u.update(0);
      expect(u.value).toBe(42);
      u.update(8);
      expect(u.value).toBe(8 * 8 + 42);
      u.update(888);
      expect(u.value).toBe(150);
    });
  });

  describe('DiminishingUserStatus', function() {
    var DiminishingUserStatus;
    beforeEach(inject(function(_DiminishingUserStatus_) {
      DiminishingUserStatus = _DiminishingUserStatus_;
    }));

    it('should update its value', function() {
      var s1 = new DiminishingUserStatus(30.0, 75.0, 0.01);
      s1.update(0);
      expect(s1.value).toBe(30.0);
      s1.update(5);
      expect(s1.value).toBe(75 - 45 * Math.pow(0.99, 5));
    });

    it('should update to consistent value with level', function() {
      var s1 = new DiminishingUserStatus(30.0, 75.0, 0.08);
      var s2 = new DiminishingUserStatus(30.0, 75.0, 0.08);
      s1.update(2);
      s1.update(3);
      s1.update(4);
      s1.update(5);
      s2.update(5);
      expect(s1.value).toBe(s2.value);
    });
  });
});
