package com.github.alexandergillon.mini_metro_maps.models.bezier;

import com.github.alexandergillon.mini_metro_maps.MathUtil;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Class for a model Bezier curve, structured so that JSON can be read into it with Jackson.
 * This class is used for generating all other Bezier curves.
 * Note: points in this class represent the OFFSETS of Bezier control points from the intersection point.
 * The 'intersection' point is where the straight lines that extend from each point meet. For example, for a sharp curve:
 *
 * station1 -------------------\       o <-- intersection point
 *                              \
 *                               \
 *                                \
 *                                 \
 *                                  \
 *                                   \
 *                                    \
 *                                    |
 *                                    |
 *                                    |
 *                                    |
 *                                station2
 *
 * Or, for a wide curve:
 *
 * station1 -------------\      o <-- intersection point
 *                        --\
 *                           --- _
 *                                \
 *                                 \
 *                                  \
 *                                   \
 *                                    \
 *                                     \
 *                                  station2
 *
 * It's hard to make these look great due to the limitations of ASCII art. However, note that the sharp curve goes
 * from a horizontal to a vertical, whereas the wide curve goes from a horizontal to a diagonal.
 *
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ModelBezierCurve {
    private Point p0Offset;
    private Point p1Offset;
    private Point p2Offset;
    private Point p3Offset;

    @Override
    public String toString() {
        return String.format("BezierCurve(%s, %s, %s, %s)",
                p0Offset.toString(), p1Offset.toString(), p2Offset.toString(), p3Offset.toString());
    }

    /**
     * Returns the Bezier curve obtained by scaling this point from the origin with a factor of c.
     * As everything runs on integer coordinates, this method is unlikely to produce good results if the resulting
     * coordinate values will be very small, due to rounding errors.
     * */
    public ModelBezierCurve scale(double c) {
        Point newP0Offset = new Point(
                MathUtil.symmetricRound(p0Offset.getX() * c),
                MathUtil.symmetricRound(p0Offset.getY() * c)
        );
        Point newP1Offset = new Point(
                MathUtil.symmetricRound(p1Offset.getX() * c),
                MathUtil.symmetricRound(p1Offset.getY() * c)
        );
        Point newP2Offset = new Point(
                MathUtil.symmetricRound(p2Offset.getX() * c),
                MathUtil.symmetricRound(p2Offset.getY() * c)
        );
        Point newP3Offset = new Point(
                MathUtil.symmetricRound(p3Offset.getX() * c),
                MathUtil.symmetricRound(p3Offset.getY() * c)
        );

        return new ModelBezierCurve(newP0Offset, newP1Offset, newP2Offset, newP3Offset);
    }
}
