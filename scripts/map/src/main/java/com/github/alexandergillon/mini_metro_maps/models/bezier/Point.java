package com.github.alexandergillon.mini_metro_maps.models.bezier;

import com.github.alexandergillon.mini_metro_maps.models.Station;
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

    /** Returns the point obtained by adding dx and dy to this point's x and y. */
    public Point add(double dx, double dy) {
        return new Point(x + dx, y + dy);
    }

    /** Returns the point obtained by adding another point's x and y to this point's x and y. */
    public Point add(Point p) {
        return new Point(x + p.getX(), y + p.getY());
    }

    /** Returns the point obtained by subtracting dx and dy from this point's x and y. */
    public Point subtract(double dx, double dy) {
        return new Point(x - dx, y - dy);
    }

    /** Returns the point obtained by scaling this point from the origin with a factor of c. */
    public Point scale(double c) {
        return new Point(x * c, y * c);
    }

    /** Converts this Point to an Apache Commons Math matrix. */
    public RealMatrix toRealMatrix() {
        return MatrixUtils.createRealMatrix(new double[][]{{x}, {y}});
    }

    /** Converts an Apache Commons Math matrix to a Point. */
    public static Point fromRealMatrix(RealMatrix m) {
        return new Point(m.getEntry(0, 0), m.getEntry(1, 0));
    }

    /** Converts the solved coordinates in a Station to a Point. */
    public static Point fromSolvedStationCoordinates(Station station) {
        return new Point(station.getSolvedX(), station.getSolvedY());
    }
}
