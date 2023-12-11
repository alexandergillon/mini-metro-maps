package com.github.alexandergillon.mini_metro_maps.models.bezier;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;

/** Class for a point, structured so that JSON can be read into it with Jackson. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Point {
    private double x;
    private double y;

    @Override
    public String toString() {
        return String.format("(%.2f, %.2f)", x, y);
    }

    /** Converts this Point to an Apache Commons Math matrix. */
    public RealMatrix toRealMatrix() {
        return MatrixUtils.createRealMatrix(new double[][]{{x}, {y}});
    }

    /** Converts an Apache Commons Math matrix to a Point. */
    public static Point fromRealMatrix(RealMatrix m) {
        return new Point(m.getEntry(0, 0), m.getEntry(1, 0));
    }
}
