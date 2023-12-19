package com.github.alexandergillon.mini_metro_maps.models.bezier;

import com.github.alexandergillon.mini_metro_maps.MathUtil;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;

import java.util.Objects;

/** Class for a point, structured so that JSON can be read into it with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Point {
    private int x;
    private int y;

    /** Constructor for converting from double coordinate values. Input x, y must approximately be integers. */
    public Point(double x, double y) {
        assert MathUtil.approxInt(x);
        assert MathUtil.approxInt(y);
        assert x > Integer.MIN_VALUE && x < Integer.MAX_VALUE;
        assert y > Integer.MIN_VALUE && y < Integer.MAX_VALUE;

        this.x = (int)Math.round(x);
        this.y = (int)Math.round(y);
    }

    @Override
    public String toString() {
        return String.format("(%d, %d)", x, y);
    }

    /** Returns the point obtained by adding dx and dy to this point's x and y. */
    public Point add(int dx, int dy) {
        return new Point(x + dx, y + dy);
    }

    /** Returns the point obtained by adding another point's x and y to this point's x and y. */
    public Point add(Point p) {
        return new Point(x + p.x, y + p.y);
    }

    /** Returns the point obtained by subtracting dx and dy from this point's x and y. */
    public Point subtract(int dx, int dy) {
        return new Point(x - dx, y - dy);
    }

    /** Converts this Point to an Apache Commons Math matrix. */
    public RealMatrix toRealMatrix() {
        return MatrixUtils.createRealMatrix(new double[][]{{x}, {y}});
    }

    /** Converts an Apache Commons Math matrix to a Point. */
    public static Point fromRealMatrix(RealMatrix m) {
        return new Point(m.getEntry(0, 0), m.getEntry(1, 0));
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Point point = (Point) o;
        return x == point.x && y == point.y;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}
