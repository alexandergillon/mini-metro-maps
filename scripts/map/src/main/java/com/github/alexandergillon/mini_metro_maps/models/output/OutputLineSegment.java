package com.github.alexandergillon.mini_metro_maps.models.output;

import com.github.alexandergillon.mini_metro_maps.models.bezier.BezierCurve;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.bezier.StraightLine;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Class for a line segment (either straight line or Bezier curve) in the output file, for writing with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OutputLineSegment {

    /**
     * Whether this line segment is a straight line.
     * If true, p0 and p1 are the endpoints of the line and p2, p3 are null.
     * If false, p0, p1, p2, p3 are the Bezier control points.
     */
    private boolean isStraightLine;

    private Point p0;
    private Point p1;
    private Point p2;
    private Point p3;

    /** Converts a StraightLine into an OutputLineSegment. */
    public OutputLineSegment fromStraightLine(StraightLine straightLine) {
        return new OutputLineSegment(true, straightLine.getP0(), straightLine.getP1(), null, null);
    }

    /** Converts a BezierCurve into an OutputLineSegment. */
    public OutputLineSegment fromBezierCurve(BezierCurve bezierCurve) {
        return new OutputLineSegment(false, bezierCurve.getP0(), bezierCurve.getP1(), bezierCurve.getP2(), bezierCurve.getP3());
    }

}
