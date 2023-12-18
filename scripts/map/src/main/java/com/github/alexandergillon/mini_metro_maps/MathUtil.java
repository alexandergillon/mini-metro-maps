package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import org.apache.commons.math3.geometry.euclidean.twod.Line;
import org.apache.commons.math3.geometry.euclidean.twod.Vector2D;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.nonlinear.scalar.GoalType;
import org.apache.commons.math3.optim.univariate.BrentOptimizer;
import org.apache.commons.math3.optim.univariate.SearchInterval;
import org.apache.commons.math3.optim.univariate.UnivariateObjectiveFunction;

import java.util.List;
import java.util.function.UnaryOperator;

/** Class for various mathematical utility methods. */
public class MathUtil {

    private MathUtil() {
        throw new IllegalStateException("Utility classes should not be instantiated.");
    }

    /** Epsilon for when doubles are considered equal. Probably only good for not huge doubles, which is OK. */
    private static final double DOUBLE_TOLERANCE = 0.0000001;

    /**
     * Approximate double equality.
     * This doesn't generalize to very large doubles, but with maps we are not working with numbers that are that large.
     */
    public static boolean approxEqual(double d1, double d2) {
        return Math.abs(d1 - d2) < DOUBLE_TOLERANCE;
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

    /** Returns the intersection point between the line passing through p0, p1 and the line y = c. */
    public static Point intersectionWithY(Point p0, Point p1, int c) {
        Vector2D p0Vector = new Vector2D(p0.getX(), p0.getY());
        Vector2D p1Vector = new Vector2D(p1.getX(), p1.getY());

        Vector2D yPoint = new Vector2D(0, c);

        Line p0P1Line = new Line(p0Vector, p1Vector, DOUBLE_TOLERANCE);
        Line yEqualsCLine = new Line(yPoint, 0, DOUBLE_TOLERANCE);

        Vector2D intersection = p0P1Line.intersection(yEqualsCLine);

        return new Point(intersection.getX(), intersection.getY());
    }

    /** POJO for holding a Bezier curve. */
    public record BezierCurve(Point p0, Point p1, Point p2, Point p3) { }

    /**
     * Truncates a Bezier curve at the closest point on the curve to `target`. Then, sets the endpoint of the truncated
     * curve to `target`, for alignment purposes. This changes the curve a tiny bit, but shouldn't be noticable.
     * @param target The target point to truncate at.
     * @param curve The curve to truncate.
     * @param keepFirstSegment Whether to keep the first segment of the curve (from p0 to target), or the second segment
     *                         (target to p3).
     * @return The truncated curve.
     */
    public static BezierCurve truncateBezier(Point target, BezierCurve curve, boolean keepFirstSegment) {
        // Evaluates x coordinate of the Bezier curve at parameter t.
        UnaryOperator<Double> bezierX = t ->
                Math.pow(1-t, 3) * curve.p0().getX()
                        + 3 * Math.pow(1-t, 2) * t * curve.p1().getX()
                        + 3 * (1-t) * Math.pow(t, 2) * curve.p2().getX()
                        + Math.pow(t, 3) * curve.p3().getX();

        // Evaluates y coordinate of the Bezier curve at parameter t.
        UnaryOperator<Double> bezierY = t ->
                Math.pow(1-t, 3) * curve.p0().getY()
                        + 3 * Math.pow(1-t, 2) * t * curve.p1().getY()
                        + 3 * (1-t) * Math.pow(t, 2) * curve.p2().getY()
                        + Math.pow(t, 3) * curve.p3().getY();

        // Finds the t which yields the closest point on the curve to the target.
        double truncationT = findTruncationT(target, bezierX, bezierY);

        // Splits the curve at t, and keeps the appropriate segment.
        if (keepFirstSegment) {
            BezierCurve result = truncateBezierKeepFirstSegment(truncationT, curve.p0(), curve.p1(), curve.p2(), curve.p3());
            return new BezierCurve(result.p0(), result.p1(), result.p2(), target); // ensures that result lines up with target exactly
        } else {
            BezierCurve result = truncateBezierKeepSecondSegment(truncationT, curve.p0(), curve.p1(), curve.p2(), curve.p3());
            return new BezierCurve(target, result.p1(), result.p2(), result.p3()); // ensures that result lines up with target exactly
        }
    }

    /**
     * Finds the value of the Bezier curve t parameter which yields the closest point on the curve to the target.
     * @param target The target point.
     * @param bezierX A function t -> x(t) for the Bezier curve.
     * @param bezierY A function t -> y(t) for the Bezier curve.
     * @return The value of the Bezier curve t parameter which yields the closest point on the curve to the target.
     */
    private static double findTruncationT(Point target, UnaryOperator<Double> bezierX, UnaryOperator<Double> bezierY) {
        BrentOptimizer optimizer = new BrentOptimizer(0.000001, 0.000001);
        GoalType goalType = GoalType.MINIMIZE;
        SearchInterval searchInterval = new SearchInterval(0, 1);
        MaxEval maxEval = new MaxEval(1000);

        // Calculates distance from the Bezier curve at t and the target point - by minimizing this, we get the t
        // which yields the closest point on the curve to the target.
        UnivariateObjectiveFunction distanceToTruncationPoint = new UnivariateObjectiveFunction(t -> {
            double dx = target.getX() - bezierX.apply(t);
            double dy = target.getY() - bezierY.apply(t);
            return Math.sqrt(dx * dx + dy * dy);
        });

        return optimizer.optimize(distanceToTruncationPoint, searchInterval, goalType, maxEval).getPoint();
    }

    /** Rounds all values in a matrix. */
    private static void round(RealMatrix m) {
        for (int i = 0; i < m.getRowDimension(); i++) {
            for (int j = 0; j < m.getColumnDimension(); j++) {
                m.setEntry(i, j, Math.rint(m.getEntry(i, j))); // rint() over round() because matrix can only contain doubles
            }
        }
    }

    /**
     * Truncates a Bezier curve at parameter t, returning the first segment of the curve (from p0 to (x(t), y(t))).
     * Uses the following method: https://pomax.github.io/bezierinfo/#matrixsplit.
     * @param t Parameter value to truncate at.
     * @param p0 Control point of Bezier curve.
     * @param p1 Control point of Bezier curve.
     * @param p2 Control point of Bezier curve.
     * @param p3 Control point of Bezier curve.
     * @return The first segment of the curve truncated at (x(t), y(t)) (from p0 to (x(t), y(t))).
     */
    private static BezierCurve truncateBezierKeepFirstSegment(double t, Point p0, Point p1, Point p2, Point p3) {
        RealMatrix bezierMatrix = MatrixUtils.createRealMatrix(new double[][]{
                { 1                , 0                       , 0                          , 0              },
                { -(t-1)           , t                       , 0                          , 0              },
                { Math.pow(t-1, 2) , -2 * (t-1) * t          , Math.pow(t, 2)             , 0              },
                { -Math.pow(t-1, 3), 3 * Math.pow(t-1, 2) * t, -3 * (t-1) * Math.pow(t, 2), Math.pow(t, 3) }
        });

        return truncateBezierInternal(p0, p1, p2, p3, bezierMatrix);
    }

    /**
     * Truncates a Bezier curve at parameter t, returning the segment segment of the curve (from (x(t), y(t)) to p3).
     * Uses the following method: https://pomax.github.io/bezierinfo/#matrixsplit.
     * @param t Parameter value to truncate at.
     * @param p0 Control point of Bezier curve.
     * @param p1 Control point of Bezier curve.
     * @param p2 Control point of Bezier curve.
     * @param p3 Control point of Bezier curve.
     * @return The second segment of the curve truncated at (x(t), y(t)) (from (x(t), y(t)) to p3).
     */
    private static BezierCurve truncateBezierKeepSecondSegment(double t, Point p0, Point p1, Point p2, Point p3) {
        RealMatrix bezierMatrix = MatrixUtils.createRealMatrix(new double[][]{
                { -Math.pow(t-1, 3), 3 * Math.pow(t-1, 2) * t, -3 * (t-1) * Math.pow(t, 2), Math.pow(t, 3) },
                { 0                , Math.pow(t-1, 2)        , -2 * (t-1) * t             , Math.pow(t, 2) },
                { 0                , 0                       , -(t-1)                     , t              },
                { 0                , 0                       , 0                          , 1              }
        });

        return truncateBezierInternal(p0, p1, p2, p3, bezierMatrix);
    }

    /**
     * Given the appropriate matrix for truncation, performs the truncation and extracts the results.
     * @param p0 Control point of Bezier curve.
     * @param p1 Control point of Bezier curve.
     * @param p2 Control point of Bezier curve.
     * @param p3 Control point of Bezier curve.
     * @param bezierMatrix Matrix for truncation, as defined in https://pomax.github.io/bezierinfo/#matrixsplit.
     * @return The truncated curve.
     */
    private static BezierCurve truncateBezierInternal(Point p0, Point p1, Point p2, Point p3, RealMatrix bezierMatrix) {
        RealMatrix coordinates = MatrixUtils.createRealMatrix(new double[][]{
                { p0.getX(), p0.getY() },
                { p1.getX(), p1.getY() },
                { p2.getX(), p2.getY() },
                { p3.getX(), p3.getY() },
        });

        RealMatrix result = bezierMatrix.multiply(coordinates);
        round(result);

        Point newP0 = new Point(result.getEntry(0, 0), result.getEntry(0, 1));
        Point newP1 = new Point(result.getEntry(1, 0), result.getEntry(1, 1));
        Point newP2 = new Point(result.getEntry(2, 0), result.getEntry(2, 1));
        Point newP3 = new Point(result.getEntry(3, 0), result.getEntry(3, 1));

        return new BezierCurve(newP0, newP1, newP2, newP3);
    }
}
