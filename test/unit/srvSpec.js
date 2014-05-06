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
      var maxWidth = render.width();
      var maxHeight = render.height();
      var obj = {
        imageWidth: imgWidth,
        imageHeight: imgHeight,
        centerCoords: function() {
          return {
            x: this.x,
            y: this.y
          }
        }
      };

      obj.x = 30000;
      obj.y = 53424;
      render.truncateCoords(obj);
      expect(obj.x).toBeLessThan(maxWidth);
      expect(obj.y).toBeLessThan(maxHeight);

      obj.x = -239487;
      obj.y = -874;
      render.truncateCoords(obj);
      expect(obj.x).toBeGreaterThan(0);
      expect(obj.y).toBeGreaterThan(0);

      var cx = maxWidth / 2;
      var cy = maxWidth / 2;
      obj.x = cx+1;
      obj.y = cy-1;
      render.truncateCoords(obj);
      expect(obj.x).toBeCloseTo(cx+1);
      expect(obj.y).toBeCloseTo(cy-1);
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

  describe('Drawable', function() {
    var Drawable;
    beforeEach(inject(function(_Drawable_) {
      Drawable = _Drawable_;
    }));

    it('should compute center coords without rotation', function() {
      var d = new Drawable(12.5, 9.8, 0);
      d.imageWidth = 22.2;
      d.imageHeight = 18.8;
      var c = d.centerCoords();
      expect(c.x).toBeCloseTo(12.5);
      expect(c.y).toBeCloseTo(9.8);
    });

    it('should compute center coords with rotation', function() {
      var d = new Drawable(12.5, 9.8, Math.PI / 3);
      d.imageWidth = 22.2;
      d.imageHeight = 18.8;
      var c = d.centerCoords();
      expect(c.x).toBeCloseTo(12.5);
      expect(c.y).toBeCloseTo(9.8);
    });

    it('should compute canvas coords without rotation', function() {
      var d = new Drawable(12.5, 9.8, 0);
      d.imageWidth = 22.2;
      d.imageHeight = 18.8;
      var c = d.canvasCoords();
      expect(c.x).toBeCloseTo(12.5 - 0.5 * 22.2);
      expect(c.y).toBeCloseTo(9.8 - 0.5 * 18.8);
    });

  });

  describe('ants', function() {
    var ants;
    beforeEach(inject(function(_ants_) {
      ants = _ants_;
    }));

    it('should add ant', function() {
      var a = ants.add(12.8, 18.2, 0);
      expect(a.x).toBeCloseTo(12.8);
      expect(a.y).toBeCloseTo(18.2);
    });

    it('should list ants within circle', function() {
      var a1 = ants.add(10.5, 10.5, 0);
      var a2 = ants.add(11.45, 11.45, 0);
      var a3 = ants.add(12.5, 12.5, 0);
      var c = a2.centerCoords();
      var r = ants.allAntsWithin(c.x, c.y, Math.sqrt(2));
      expect(r.length).toBe(2);
    });

    it('should list ants within circle with rotation', function() {
      var r = Math.PI * 2 / 3
      var a1 = ants.add(10.5, 10.5, r);
      var a2 = ants.add(11.45, 11.45, r);
      var a3 = ants.add(12.5, 12.5, r);
      var c = a2.centerCoords();
      var r = ants.allAntsWithin(c.x, c.y, Math.sqrt(2));
      expect(r.length).toBe(2);
    });
  });
});
