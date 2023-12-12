package com.github.alexandergillon.mini_metro_maps.models.bezier;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Class for a Bezier curve, structured so that JSON can be read into it with Jackson.
 * p0, p1, p2, p3 have their usual meaning for Bezier curves (p0, p3 are endpoints and p1, p2 are control points).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BezierCurve {
    private Point p0;
    private Point p1;
    private Point p2;
    private Point p3;

    @Override
    public String toString() {
        return String.format("BezierCurve(%s, %s, %s, %s)", p0.toString(), p1.toString(), p2.toString(), p3.toString());
    }

    /** Returns the Bezier curve obtained by scaling this point from the origin with a factor of c. */
    public BezierCurve scale(double c) {
        return new BezierCurve(p0.scale(c), p1.scale(c), p2.scale(c), p3.scale(c));
    }
}
