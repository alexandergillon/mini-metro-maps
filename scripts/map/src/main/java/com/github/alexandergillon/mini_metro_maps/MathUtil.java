package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;

import java.util.List;

/** Class for various mathematical utility methods. */
public class MathUtil {

    private MathUtil() {
        throw new IllegalStateException("Utility classes should not be instantiated.");
    }

    /**
     * Approximate double equality.
     * This doesn't generalize to very large doubles, but with maps we are not working with numbers that are that large.
     */
    public static boolean approxEqual(double d1, double d2) {
        return Math.abs(d1 - d2) < 0.0000001;
    }

    /** Returns whether a double is approximately an integer. */
    public static boolean approxInt(double d) {
        return approxEqual(Math.round(d), d);
    }

    /** Rounds a double, symmetrically. E.g. symmetricRound(1.5) = 2, symmetricRound(-1.5) = -2. */
    public static double symmetricRound(double d) {
        if (d >= 0) {
            return Math.floor(d + 0.5d);
        } else {
            return Math.ceil(d - 0.5d);
        }
    }

    /**
     * Normalizes a 2D vector.
     * @param v A 2D vector.
     * @return v, normalized.
     */
    private static RealMatrix normalize(RealMatrix v) {
        assert v.getRowDimension() == 2 && v.getColumnDimension() == 1;

        double x = v.getEntry(0, 0);
        double y = v.getEntry(1, 0);

        double magnitude = Math.sqrt(x * x + y * y);
        return MatrixUtils.createRealMatrix(new double[][]{{x / magnitude}, {y / magnitude}});
    }

    /**
     * Reflects a point in a line. This uses the following formula:
     *   Q' = Q + 2(I - nn^T)(P - Q)
     * which calculates the reflection Q' of a point in a line, where:
     *   Q = point to reflect
     *   I = identity matrix
     *   n = unit vector along the line to reflect in
     *   P = point on the line to reflect in
     *
     * @param Q Point to reflect.
     * @param P Point on the line to reflect in.
     * @param N Vector along the line to reflect in (does not have to be normalized).
     * @return A reflected point Q'.
     */
    private static RealMatrix reflect(RealMatrix Q, RealMatrix P, RealMatrix N) {
        RealMatrix n = normalize(N);
        RealMatrix I = MatrixUtils.createRealMatrix(new double[][]{{1, 0}, {0, 1}});
        return Q.add(
                (I.subtract(n.multiply(n.transpose())))
                        .multiply(P.subtract(Q))
                        .scalarMultiply(2)
        );
    }

    /** Reflects toReflect in the line that passes through p0, p1. */
    public static Point reflect(Point toReflect, Point p0, Point p1) {
        if (toReflect == null) return null; // Useful when reflecting OutputLineSegments which are straight lines

        RealMatrix Q = toReflect.toRealMatrix();
        RealMatrix P = p0.toRealMatrix();
        RealMatrix N = P.subtract(p1.toRealMatrix());
        return Point.fromRealMatrix(reflect(Q, P, N));
    }

    /** Reflects a line segment in the line that passes through p0, p1. */
    public static OutputLineSegment reflect(OutputLineSegment lineSegment, Point p0, Point p1) {
        Point newP0 = reflect(lineSegment.getP0(), p0, p1);
        Point newP1 = reflect(lineSegment.getP1(), p0, p1);
        Point newP2 = reflect(lineSegment.getP2(), p0, p1);
        Point newP3 = reflect(lineSegment.getP3(), p0, p1);

        return new OutputLineSegment(lineSegment.isStraightLine(), newP0, newP1, newP2, newP3);
    }

    /** Reflects a list of line segments in the line that passes through p0, p1. */
    public static List<OutputLineSegment> reflect(List<OutputLineSegment> lineSegments, Point p0, Point p1) {
        return lineSegments.stream().map(lineSegment -> reflect(lineSegment, p0, p1)).toList();
    }

    /** Reflects a point in the line x = c. */
    public static Point reflectX(Point point, double c) {
        if (point == null) return null; // Useful when reflecting OutputLineSegments which are straight lines

        RealMatrix Q = point.toRealMatrix();
        RealMatrix P = MatrixUtils.createRealMatrix(new double[][]{{c}, {0}});
        RealMatrix n = MatrixUtils.createRealMatrix(new double[][]{{0}, {1}});

        return Point.fromRealMatrix(reflect(Q, P, n));
    }

    /** Reflects a line segment in the line x = c. */
    public static OutputLineSegment reflectX(OutputLineSegment lineSegment, double c) {
        Point newP0 = reflectX(lineSegment.getP0(), c);
        Point newP1 = reflectX(lineSegment.getP1(), c);
        Point newP2 = reflectX(lineSegment.getP2(), c);
        Point newP3 = reflectX(lineSegment.getP3(), c);

        return new OutputLineSegment(lineSegment.isStraightLine(), newP0, newP1, newP2, newP3);
    }

    /** Reflects a list of line segments in the line x = c. */
    public static List<OutputLineSegment> reflectX(List<OutputLineSegment> lineSegments, double c) {
        return lineSegments.stream().map(lineSegment -> reflectX(lineSegment, c)).toList();
    }

    /** Reflects a point in the line y = c. */
    public static Point reflectY(Point point, double c) {
        if (point == null) return null; // Useful when reflecting OutputLineSegments which are straight lines

        RealMatrix Q = point.toRealMatrix();
        RealMatrix P = MatrixUtils.createRealMatrix(new double[][]{{0}, {c}});
        RealMatrix n = MatrixUtils.createRealMatrix(new double[][]{{1}, {0}});

        return Point.fromRealMatrix(reflect(Q, P, n));
    }

    /** Reflects a line segment in the line y = c. */
    public static OutputLineSegment reflectY(OutputLineSegment lineSegment, double c) {
        Point newP0 = reflectY(lineSegment.getP0(), c);
        Point newP1 = reflectY(lineSegment.getP1(), c);
        Point newP2 = reflectY(lineSegment.getP2(), c);
        Point newP3 = reflectY(lineSegment.getP3(), c);

        return new OutputLineSegment(lineSegment.isStraightLine(), newP0, newP1, newP2, newP3);
    }

    /** Reflects a list of line segments in the line y = c. */
    public static List<OutputLineSegment> reflectY(List<OutputLineSegment> lineSegments, double c) {
        return lineSegments.stream().map(lineSegment -> reflectY(lineSegment, c)).toList();
    }

    /** Reflects a point in the lines x = c, y = d. */
    public static Point reflectXY(Point point, double c, double d) {
        if (point == null) return null; // Useful when reflecting OutputLineSegments which are straight lines

        return reflectY(reflectX(point, c), d);
    }

    /** Reflects a line segment in the lines x = c, y = d. */
    public static OutputLineSegment reflectXY(OutputLineSegment lineSegment, double c, double d) {
        Point newP0 = reflectXY(lineSegment.getP0(), c, d);
        Point newP1 = reflectXY(lineSegment.getP1(), c, d);
        Point newP2 = reflectXY(lineSegment.getP2(), c, d);
        Point newP3 = reflectXY(lineSegment.getP3(), c, d);

        return new OutputLineSegment(lineSegment.isStraightLine(), newP0, newP1, newP2, newP3);
    }

    /** Reflects a list of line segments in the lines x = c, y = d. */
    public static List<OutputLineSegment> reflectXY(List<OutputLineSegment> lineSegments, double c, double d) {
        return lineSegments.stream().map(lineSegment -> reflectXY(lineSegment, c, d)).toList();
    }
}
