package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.core.Curve;
import com.github.alexandergillon.mini_metro_maps.models.bezier.BezierCurve;
import com.github.alexandergillon.mini_metro_maps.models.bezier.ModelBezierCurve;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.bezier.StraightLine;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import org.apache.commons.lang3.ArrayUtils;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Class to handle converting curves (as specified in the input file) to line segments of straight lines and Bezier curves. */
public class BezierGenerator {

    /**
     * Scaling parameter for sharp Bezier curves, relative to the model curve read from bezier.json.
     * The model curve was likely measured with a different scale than the map, so this factor scales it accordingly.
     * The value of this parameter was found by trial and error.
     */
    private final double SHARP_CURVE_BEZIER_SCALE_FACTOR = 0.4;

    /**
     * Scaling parameter for wide Bezier curves, relative to the model curve read from bezier.json.
     * The model curve was likely measured with a different scale than the map, so this factor scales it accordingly.
     * The value of this parameter was found by trial and error.
     */
    private final double WIDE_CURVE_BEZIER_SCALE_FACTOR = 5;

    /**
     * Overall scale factor that needs to be applied to generated sharp Bezier curves: incorporates the map's scale
     * factor so that if we change SCALE_FACTOR in GenerateMap, this still works.
     */
    private final double SHARP_CURVE_SCALE_FACTOR = GenerateMap.SCALE_FACTOR * SHARP_CURVE_BEZIER_SCALE_FACTOR;

    /**
     * Overall scale factor that needs to be applied to generated wide Bezier curves: incorporates the map's scale
     * factor so that if we change SCALE_FACTOR in GenerateMap, this still works.
     */
    private final double WIDE_CURVE_SCALE_FACTOR = GenerateMap.SCALE_FACTOR * WIDE_CURVE_BEZIER_SCALE_FACTOR;

    /**
     * Model Bezier curve for a sharp curve. A sharp curve is a 90 degree curve (going from one horizontal/vertical
     * to another). The model curves were found manually.
     */
    private final ModelBezierCurve modelSharpCurve;

    /**
     * Model Bezier curve for a wide curve. A wide curve is a 135 degree curve (going from a diagonal to a
     * vertical/horizontal). The model curves were found manually.
     */
    private final ModelBezierCurve modelWideCurve;

    /** The canonical curve types for a sharp curve. Every sharp curve can be represented as a curve with one of these types. */
    private static final String[] CANONICAL_SHARP_CURVE_TYPES = {
            "right,up",
            "right,down",
            "up,right",
            "down,right"
    };

    /** The canonical curve types for a wide curve. Every wide curve can be represented as a curve with one of these types. */
    private static final String[] CANONICAL_WIDE_CURVE_TYPES = {
            "right,up-right",
            "right,down-right",
            "left,up-left",
            "left,down-left",
            "up,up-right",
            "up,up-left",
            "down,down-right",
            "down,down-left"
    };

    /** All canonical curve types. */
    private static final String[] CANONICAL_CURVE_TYPES = ArrayUtils.addAll(CANONICAL_SHARP_CURVE_TYPES, CANONICAL_WIDE_CURVE_TYPES);

    /** Opposite direction of each direction. */
    private static final Map<String, String> SWAP_DIRECTION = Map.of(
            "right", "left",
            "left", "right",
            "up", "down",
            "down", "up",

            "up-right", "down-left",
            "down-left", "up-right",

            "down-right", "up-left",
            "up-left", "down-right"
    );

    /**
     * Constructor. Reads in the model curves from bezier.json.
     * @param bezierPath Path to bezier.json, for model Bezier curves.
     */
    public BezierGenerator(String bezierPath) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode json = objectMapper.readTree(new File(bezierPath));

        modelSharpCurve = objectMapper.treeToValue(json.get("sharp_curve"), ModelBezierCurve.class).scale(SHARP_CURVE_SCALE_FACTOR);
        modelWideCurve = objectMapper.treeToValue(json.get("wide_curve"), ModelBezierCurve.class).scale(WIDE_CURVE_SCALE_FACTOR);

        // Ensures model sharp curve is down/right
        assert modelSharpCurve.getP0Offset().getX() < modelSharpCurve.getP3Offset().getX();
        assert modelSharpCurve.getP0Offset().getY() < modelSharpCurve.getP3Offset().getY();

        // Ensures model wide curve is down/right
        assert modelWideCurve.getP0Offset().getX() < modelWideCurve.getP3Offset().getX();
        assert modelWideCurve.getP0Offset().getY() < modelWideCurve.getP3Offset().getY();
    }

    /**
     * Converts a Curve object to its line segments.
     * @param curve Curve to convert.
     * @return Line segments for that curve.
     */
    public List<OutputLineSegment> toLineSegments(Curve curve) {
        if (curve.type().equals("special")) {
            // todo: handle properly
            Point station1 = Point.fromSolvedStationCoordinates(curve.from());
            Point station2 = Point.fromSolvedStationCoordinates(curve.to());
            return List.of(OutputLineSegment.fromStraightLine(new StraightLine(station1, station2)));
        }

        Curve canonicalCurve = toCanonical(curve);
        if (ArrayUtils.contains(CANONICAL_SHARP_CURVE_TYPES, canonicalCurve.type())) {
            return toSharpCurve(canonicalCurve);
        } else {
            return toWideCurve(canonicalCurve);
        }
    }

    /**
     * Converts a curve to an equivalent curve with a canonical type.
     * @param curve The curve to convert.
     * @return An equivalent curve, with a canonical type.
     */
    private static Curve toCanonical(Curve curve) {
        if (ArrayUtils.contains(CANONICAL_CURVE_TYPES, curve.type())) {
            return curve; // curve is already canonical
        } else {
            // Why this works is best illustrated by trying some examples with pen and paper.
            // First, swap the two tokens, then convert each token to its opposite, and then swap the endpoints.
            String[] curveTypeTokens = curve.type().split(",");
            String newCurveType = SWAP_DIRECTION.get(curveTypeTokens[1]) + "," + SWAP_DIRECTION.get(curveTypeTokens[0]);
            assert ArrayUtils.contains(CANONICAL_CURVE_TYPES, newCurveType);
            return new Curve(curve.to(), curve.from(), newCurveType);
        }
    }

    /**
     * Joins two stations with a sharp curve, which leaves the first station going right and enters the second
     * station going down. Diagram is very zoomed in, due to limitations of ASCII art:
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
     *
     * See ModelBezierCurve.java for more information on the intersection point.
     *
     * @param station1 Coordinates of the first station.
     * @param station2 Coordinates of the second station.
     * @return Line segments for a right,down sharp curve between those two stations.
     */
    private List<OutputLineSegment> toSharpCurveRightDown(Point station1, Point station2) {
        assert station1.getX() < station2.getX(); // station 2 is to the right of station 1
        assert station1.getY() < station2.getY(); // station 2 is below station 1

        Point intersectionPoint = new Point(station2.getX(), station1.getY());

        Point bezierP0 = intersectionPoint.add(modelSharpCurve.getP0Offset());
        Point bezierP1 = intersectionPoint.add(modelSharpCurve.getP1Offset());
        Point bezierP2 = intersectionPoint.add(modelSharpCurve.getP2Offset());
        Point bezierP3 = intersectionPoint.add(modelSharpCurve.getP3Offset());

        assert bezierP0.getY() == station1.getY();
        assert bezierP3.getX() == station2.getX();

        assert bezierP0.getX() >= station1.getX() : "Bezier curve extends beyond station.";
        assert bezierP3.getY() <= station2.getY() : "Bezier curve extends beyond station.";

        List<OutputLineSegment> segments = new ArrayList<>();

        if (bezierP0.getX() > station1.getX()) {
            segments.add(OutputLineSegment.fromStraightLine(new StraightLine(station1, bezierP0)));
        }

        segments.add(OutputLineSegment.fromBezierCurve(new BezierCurve(bezierP0, bezierP1, bezierP2, bezierP3)));

        if (bezierP3.getY() < station2.getY()) {
            segments.add(OutputLineSegment.fromStraightLine(new StraightLine(bezierP3, station2)));
        }

        return segments;
    }

    /**
     * Joins two stations with a sharp curve. Curves are obtained by transforming the curves to a common curve type with
     * reflections, obtain the curve, and transforming the curve back. It's easiest to see how each case works by
     * drawing them out with a pen and paper.
     * @param station1 Coordinates of the first station.
     * @param station2 Coordinates of the second station.
     * @param curveType Type of the sharp curve between the two stations.
     * @return Line segments for a sharp curve with that curve type between those two stations.
     */
    private List<OutputLineSegment> toSharpCurve(Point station1, Point station2, String curveType) {
        switch (curveType) {
            case "right,down" -> {
                return toSharpCurveRightDown(station1, station2);
            }
            case "right,up" -> {
                Point reflectedStation2 = MathUtil.reflectY(station2, station1.getY());
                var rightDownCurve = toSharpCurveRightDown(station1, reflectedStation2);
                return MathUtil.reflectY(rightDownCurve, station1.getY());
            }
            case "down,right" -> {
                Point reflectedStation2 = MathUtil.reflect(station2, station1, station1.add(1, 1));
                var rightDownCurve = toSharpCurveRightDown(station1, reflectedStation2);
                return MathUtil.reflect(rightDownCurve, station1, station1.add(1, 1));
            }
            case "up,right" -> {
                Point reflectedStation2 = MathUtil.reflectY(station2, station1.getY());
                var downRightCurve = toSharpCurve(station1, reflectedStation2, "down,right");
                return MathUtil.reflectY(downRightCurve, station1.getY());
            }
            default -> throw new IllegalArgumentException(String.format("Invalid curve type %s in toSharpCurve.", curveType));
        }
    }

    /**
     * Joins two stations with a sharp curve.
     * @param curve A sharp curve between two stations.
     * @return Line segments for a sharp curve that draws the input curve.
     */
    private List<OutputLineSegment> toSharpCurve(Curve curve) {
        Point station1 = Point.fromSolvedStationCoordinates(curve.from());
        Point station2 = Point.fromSolvedStationCoordinates(curve.to());
        return toSharpCurve(station1, station2, curve.type());
    }

    /**
     * Joins two stations with a wide curve, which leaves the first station going right and enters the second
     * station going down-right. Diagram is very zoomed in, due to limitations of ASCII art:
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
     * See ModelBezierCurve.java for more information on the intersection point.
     *
     * @param station1 Coordinates of the first station.
     * @param station2 Coordinates of the second station.
     * @return Line segments for a right,down-right wide curve between those two stations.
     */
    private List<OutputLineSegment> toWideCurveRightDownRight(Point station1, Point station2) {
        assert station1.getX() < station2.getX(); // station 2 is to the right of station 1
        assert station1.getY() < station2.getY(); // station 2 is below station 1

        Point intersectionPoint = MathUtil.intersectionWithY(station2, station2.subtract(1, 1), station1.getY());

        Point bezierP0 = intersectionPoint.add(modelWideCurve.getP0Offset());
        Point bezierP1 = intersectionPoint.add(modelWideCurve.getP1Offset());
        Point bezierP2 = intersectionPoint.add(modelWideCurve.getP2Offset());
        Point bezierP3 = intersectionPoint.add(modelWideCurve.getP3Offset());

        assert bezierP0.getY() == station1.getY();
        assert MathUtil.approxEqual(bezierP3.getX() - station2.getX(), bezierP3.getY() - station2.getY());

        assert bezierP0.getX() >= station1.getX() : "Bezier curve extends beyond station.";
        assert bezierP3.getY() <= station2.getY() : "Bezier curve extends beyond station.";

        List<OutputLineSegment> segments = new ArrayList<>();

        if (bezierP0.getX() > station1.getX()) {
            segments.add(OutputLineSegment.fromStraightLine(new StraightLine(station1, bezierP0)));
        }

        segments.add(OutputLineSegment.fromBezierCurve(new BezierCurve(bezierP0, bezierP1, bezierP2, bezierP3)));

        if (bezierP3.getY() > station2.getY()) {
            segments.add(OutputLineSegment.fromStraightLine(new StraightLine(bezierP3, station2)));
        }

        return segments;
    }

    /**
     * Joins two stations with a wide curve. Curves are obtained by transforming the curves to a common curve type with
     * reflections, obtain the curve, and transforming the curve back. It's easiest to see how each case works by
     * drawing them out with a pen and paper.
     * @param station1 Coordinates of the first station.
     * @param station2 Coordinates of the second station.
     * @param curveType Type of the wide curve between the two stations.
     * @return Line segments for a wide curve with that curve type between those two stations.
     */
    private List<OutputLineSegment> toWideCurve(Point station1, Point station2, String curveType) {
        switch (curveType) {
            case "right,down-right" -> {
                return toWideCurveRightDownRight(station1, station2);
            }
            case "right,up-right" -> {
                Point reflectedStation2 = MathUtil.reflectY(station2, station1.getY());
                var rightDownRightCurve = toWideCurveRightDownRight(station1, reflectedStation2);
                return MathUtil.reflectY(rightDownRightCurve, station2.getY());
            }
            case "left,up-left" -> {
                Point reflectedStation2 = MathUtil.reflectXY(station2, station1.getX(), station1.getY());
                var rightDownRightCurve = toWideCurveRightDownRight(station1, reflectedStation2);
                return MathUtil.reflectXY(rightDownRightCurve, station1.getX(), station1.getY());
            }
            case "left,down-left" -> {
                Point reflectedStation2 = MathUtil.reflectX(station2, station1.getX());
                var rightDownRightCurve = toWideCurveRightDownRight(station1, reflectedStation2);
                return MathUtil.reflectX(rightDownRightCurve, station1.getX());
            }
            case "up,up-right" -> {
                Point downDownRightStation2 = MathUtil.reflectY(station2, station1.getY());
                Point rightDownRightStation2 = MathUtil.reflect(downDownRightStation2, station1, station1.add(1, 1));
                var rightDownRightCurve = toWideCurveRightDownRight(station1, rightDownRightStation2);
                var downDownRightCurve = MathUtil.reflect(rightDownRightCurve, station1, station1.add(1, 1));
                return MathUtil.reflectY(downDownRightCurve, station1.getY());
            }
            case "up,up-left" -> {
                Point upUpRightStation2 = MathUtil.reflectX(station2, station1.getX());
                var upUpRightCurve = toWideCurve(station1, upUpRightStation2, "up,up-right");
                return MathUtil.reflectX(upUpRightCurve, station1.getX());
            }
            case "down,down-right" -> {
                Point reflectedStation2 = MathUtil.reflect(station2, station1, station1.add(1, 1));
                var rightDownRightCurve = toWideCurveRightDownRight(station1, reflectedStation2);
                return MathUtil.reflect(rightDownRightCurve, station1, station1.add(1, 1));
            }
            case "down,down-left" -> {
                Point downDownRightStation2 = MathUtil.reflectX(station2, station1.getX());
                var downDownRightCurve = toWideCurve(station1, downDownRightStation2, "down,down-right");
                return MathUtil.reflectX(downDownRightCurve, station1.getX());
            }
            default -> throw new IllegalArgumentException(String.format("Invalid curve type %s in toWideCurve.", curveType));
        }
    }

    /**
     * Joins two stations with a wide curve.
     * @param curve A wide curve between two stations.
     * @return Line segments for a wide curve that draws the input curve.
     */
    private List<OutputLineSegment> toWideCurve(Curve curve) {
        Point station1 = Point.fromSolvedStationCoordinates(curve.from());
        Point station2 = Point.fromSolvedStationCoordinates(curve.to());
        return toWideCurve(station1, station2, curve.type());
    }

}
