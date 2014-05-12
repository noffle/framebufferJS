'use strict';

var ImageArray = require('./image');
var letters = require('./letters');
var util = require('./util');
var pixel = require('./pixel');

var RenderPlain = require('./../render/plain');

//TODO figure out how Framebuffer and ImageArray and the renderers relate to each-other
// - maybe shovel some code around and put all pixel manipulation code in what is now ImageArray
function Framebuffer(opts) {
    // support usage without new
    if (!(this instanceof Framebuffer)) {
        return new Framebuffer(opts);
    }
    // import options
    this.width = opts.width || 32;
    this.height = opts.height || 32;

    // grab canvas stuff
    this.canvas = (typeof opts.canvas === 'string') ? document.getElementById(opts.canvas) : opts.canvas;
    if (!this.canvas) {
        throw new Error('cannot locate canvas with id "' + opts.canvas + '"');
    }

    // init internal data, use RGB (no alpha) so 3 channels
    this.image = new ImageArray(this.width, this.height, false);
    this.px = this.image.px;
    this.channels = 3;

    //alphaData(this.px, this.width, this.height, 255);
    util.discoData(this.px, this.width, this.height);

    // optional renderer
    if (typeof opts.renderer === 'function') {
        try {
            this.renderer = new (opts.renderer)(this.image, this.canvas);
        }
        catch (e) {
            console.log(e);
            console.log('render init error, switching to fallback');
        }
    }
    // default & fallback
    if (!this.renderer) {
        this.renderer = new RenderPlain(this.image, this.canvas);
    }
}

Framebuffer.prototype.fillrect = function (x, y, w, h, col) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.floor(w);
    h = Math.floor(h);

    for (var i = x; i < x + w; i++) {
        for (var j = y; j < y + h; j++) {
            // TODO move this outside the loop
            if (i < 0 || j < 0 || i >= this.width || j >= this.height) {
                continue;
            }
            var p = (i + j * this.width) * this.channels;
            this.px[p] = col[0];
            this.px[p + 1] = col[1];
            this.px[p + 2] = col[2];
        }
    }
};

Framebuffer.prototype.clear = function (col) {
    var r = col[0];
    var g = col[1];
    var b = col[2];
    var lim = this.width * this.height * this.channels;
    for (var i = 0; i < lim; i += this.channels) {
        this.px[i] = r;
        this.px[i + 1] = g;
        this.px[i + 2] = b;
    }
};

Framebuffer.prototype.rect = function (x, y, w, h, col) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.floor(w);
    h = Math.floor(h);
    for (var i = x; i < x + w; i++) {
        for (var j = y; j < y + h; j++) {
            if (i < 0 || j < 0 || i >= this.width || j >= this.height) {
                continue;
            }
            if (i === x || j === y || i === x + w - 1 || j === y + h - 1) {
                var p = (i + j * this.width) * this.channels;
                this.px[p] = col[0];
                this.px[p + 1] = col[1];
                this.px[p + 2] = col[2];
            }
        }
    }
};

Framebuffer.prototype.fillcircle = function (x, y, r, col) {
    x = Math.floor(x);
    y = Math.floor(y);
    r = Math.floor(r);
    for (var i = -r; i <= r; i++) {
        for (var j = -r; j <= r; j++) {
            if (x + i < 0 || y + j < 0 || x + i >= this.width || y + j >= this.height) {
                continue;
            }
            if (i * i + j * j <= r * r) {
                var p = (x + i + (y + j) * this.width) * this.channels;
                this.px[p] = col[0];
                this.px[p + 1] = col[1];
                this.px[p + 2] = col[2];
            }
        }
    }
};

Framebuffer.prototype.circle = function (x, y, r, col) {
    x = Math.floor(x);
    y = Math.floor(y);
    r = Math.floor(r);
    for (var i = 0; i < 360; i++) {
        var cx = Math.round(Math.cos(i * (Math.PI / 180)) * r) + x;
        var cy = Math.round(Math.sin(i * (Math.PI / 180)) * r) + y;

        if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) {
            continue;
        }
        var p = (cx + cy * this.width) * this.channels;
        this.px[p] = col[0];
        this.px[p + 1] = col[1];
        this.px[p + 2] = col[2];
    }
};

Framebuffer.prototype.pixel = function (x, y, col) {
    x = Math.floor(x);
    y = Math.floor(y);

    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
        return;
    }
    var p = (x + y * this.width) * this.channels;
    this.px[p] = col[0];
    this.px[p + 1] = col[1];
    this.px[p + 2] = col[2];
};

Framebuffer.prototype.shader = function (f) {
    var rgb = [0, 0, 0];
    for (var i = 0; i < this.width; i++) {
        for (var j = 0; j < this.height; j++) {
            var p = (i + j * this.width) * this.channels;
            rgb[0] = this.px[p];
            rgb[1] = this.px[p + 1];
            rgb[2] = this.px[p + 2];
            var col = f(i, j, rgb);
            this.px[p] = col[0];
            this.px[p + 1] = col[1];
            this.px[p + 2] = col[2];
        }
    }
};

Framebuffer.prototype.drawLetter = function (x, y, chr, rgb) {
    var l = letters[chr.toUpperCase()];
    if (!l) {
        return 0;
    }
    for (var i = 0; i < l[0].length; i++) {
        for (var j = 0; j < l.length; j++) {
            if (l[j].charAt(i) === '1') {
                this.pixel(x + i, y + j, rgb);
            }
        }
    }
    return l[0].length;
};

Framebuffer.prototype.text = function (x, y, txt, rgb) {
    for (var i = 0; i < txt.length; i++) {
        x += this.drawLetter(x, y, txt.charAt(i), rgb) + 1;
    }
};

Framebuffer.prototype.makesprite = function (width, height, useAlpha) {
    return new ImageArray(width, height, useAlpha);
};

Framebuffer.prototype.blit = function (sprite, x, y, w, h, sx, sy) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = !w ? sprite.width : Math.floor(w);
    h = !h ? sprite.height : Math.floor(h);
    sx = !sx ? 0 : Math.floor(sx);
    sy = !sy ? 0 : Math.floor(sy);
    for (var i = sx; i < sx + w; i++) {
        for (var j = sy; j < sy + h; j++) {
            if (i < 0 || j < 0 || i >= sprite.width || j >= sprite.height) {
                continue;
            }
            //TODO support alpha in sprite
            var read = (i + j * sprite.width) * sprite.channels;
            var write = (x + i - sx + (y + j - sy) * this.width) * this.channels;

            this.px[write] = sprite.px[read];
            this.px[write + 1] = sprite.px[read + 1];
            this.px[write + 2] = sprite.px[read + 2];
        }
    }
};

Framebuffer.prototype.resize = function (render) {
    this.renderer.resize();
};

Framebuffer.prototype.render = function () {
    this.renderer.update();
};

Framebuffer.prototype.close = function () {
    this.renderer.close();
    this.renderer = null;
    this.px = null;
    this.canvas = null;
    this.image = null;
};

// export pixel helpers (instance vs static.. why not both? :)
//TODO this is a bit legacy.. maybe move to bundle files?
Framebuffer.rand = Framebuffer.prototype.rand = pixel.rand;
Framebuffer.hsv2rgb = Framebuffer.prototype.hsv2rgb = pixel.hsv2rgb;
Framebuffer.rgb2hsv = Framebuffer.prototype.rgb2hsv = pixel.rgb2hsv;

module.exports = Framebuffer;
