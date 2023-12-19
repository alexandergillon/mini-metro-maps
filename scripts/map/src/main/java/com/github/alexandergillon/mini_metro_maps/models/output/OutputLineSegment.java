package com.github.alexandergillon.mini_metro_maps.models.output;

import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
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

    /** Returns this curve, with the order of points reversed. */
    public OutputLineSegment reverse() {
        if (isStraightLine) {
            return OutputLineSegment.fromStraightLine(p1, p0);
        } else {
            return OutputLineSegment.fromBezierCurve(p3, p2, p1, p0);
        }
    }

    /** Converts two points on a straight line to an OutputLineSegment. */
    public static OutputLineSegment fromStraightLine(Point p0, Point p1) {
        return new OutputLineSegment(true, p0, p1, null, null);
    }

    /** Converts four points which define a Bezier curve into an OutputLineSegment. */
    public static OutputLineSegment fromBezierCurve(Point p0, Point p1, Point p2, Point p3) {
        return new OutputLineSegment(false, p0, p1, p2, p3);
    }

}
