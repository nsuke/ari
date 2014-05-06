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
      expect(render).not.toBeNull();
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
  });
});
