/*
Copyright (c) 2023 Pomax

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { utils } from "./utils.js";

/**
 * Poly Bezier
 * @param {[type]} curves [description]
 */
class PolyBezier {
  constructor(curves) {
    this.curves = [];
    this._3d = false;
    if (!!curves) {
      this.curves = curves;
      this._3d = this.curves[0]._3d;
    }
  }

  valueOf() {
    return this.toString();
  }

  toString() {
    return (
      "[" +
      this.curves
        .map(function (curve) {
          return utils.pointsToString(curve.points);
        })
        .join(", ") +
      "]"
    );
  }

  addCurve(curve) {
    this.curves.push(curve);
    this._3d = this._3d || curve._3d;
  }

  length() {
    return this.curves
      .map(function (v) {
        return v.length();
      })
      .reduce(function (a, b) {
        return a + b;
      });
  }

  curve(idx) {
    return this.curves[idx];
  }

  bbox() {
    const c = this.curves;
    var bbox = c[0].bbox();
    for (var i = 1; i < c.length; i++) {
      utils.expandbox(bbox, c[i].bbox());
    }
    return bbox;
  }

  offset(d) {
    const offset = [];
    this.curves.forEach(function (v) {
      offset.push(...v.offset(d));
    });
    return new PolyBezier(offset);
  }
}

export { PolyBezier };