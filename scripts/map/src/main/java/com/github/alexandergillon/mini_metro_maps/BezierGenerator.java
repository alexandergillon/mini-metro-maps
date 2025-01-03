package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.bezier.ModelBezierCurve;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.core.Curve;
import com.github.alexandergillon.mini_metro_maps.models.core.Station;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputEdge;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import org.apache.commons.lang3.ArrayUtils;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** Class to handle converting curves (as specified in the input file) to line segments of straight lines and Bezier curves. */
public class BezierGenerator {

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
    private static final Map<String, String> SWAP_DIRECTION = new Util.ThrowingMap<>(Map.of(
            "right", "left",
            "left", "right",
            "up", "down",
            "down", "up",

            "up-right", "down-left",
            "down-left", "up-right",

            "down-right", "up-left",
            "up-left", "down-right"
    ));

    /** Path to store a temporary .csv file, to communicate with R. */
    private final String rCsvInPath;

    /** Path that R writes its response to. */
    private final String rCsvOutPath;

    /**
     * Constructor. Reads in the model curves from bezier.json.
     * @param bezierPath Path to bezier.json, for model Bezier curves.
     * @param rCsvInPath Path to store a temporary .csv file, to communicate with R.
     * @param rCsvOutPath Path that R writes its response to.
     */
    public BezierGenerator(String bezierPath, String rCsvInPath, String rCsvOutPath) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        JsonNode json = objectMapper.readTree(new File(bezierPath));

        modelSharpCurve = objectMapper.treeToValue(json.get("sharp_curve").get("points"), ModelBezierCurve.class)
                .scale(GenerateMap.SCALE_FACTOR * json.get("sharp_curve").get("scaleFactor").doubleValue());
        modelWideCurve = objectMapper.treeToValue(json.get("wide_curve").get("points"), ModelBezierCurve.class)
                .scale(GenerateMap.SCALE_FACTOR * json.get("wide_curve").get("scaleFactor").doubleValue());

        // Ensures model sharp curve is down/right
        assert modelSharpCurve.getP0Offset().getX() < modelSharpCurve.getP3Offset().getX();
        assert modelSharpCurve.getP0Offset().getY() < modelSharpCurve.getP3Offset().getY();

        // Ensures model wide curve is down/right
        assert modelWideCurve.getP0Offset().getX() < modelWideCurve.getP3Offset().getX();
        assert modelWideCurve.getP0Offset().getY() < modelWideCurve.getP3Offset().getY();

        this.rCsvInPath = rCsvInPath;
        this.rCsvOutPath = rCsvOutPath;
    }

    /**
     * Converts a non-special Curve object to its line segments.
     * @param curve Non-special curve to convert.
     * @return Line segments for that curve.
     */
    public List<OutputLineSegment> toLineSegmentsNonSpecial(Curve curve) {
        assert !curve.getType().equals("special");
        Curve canonicalCurve = toCanonical(curve);

        List<OutputLineSegment> lineSegments =
                ArrayUtils.contains(CANONICAL_SHARP_CURVE_TYPES, canonicalCurve.getType()) ?
                        toSharpCurve(canonicalCurve) : toWideCurve(canonicalCurve);

        // If canonical curve is reversed from input curve, we need to reverse the segments to go in the right direction.
        if (!curve.getType().equals(canonicalCurve.getType())) {
            // Need a copy, as sometimes returned list is immutable. Not the most efficient, but doesn't need to be.
            lineSegments = new ArrayList<>(lineSegments);
            Collections.reverse(lineSegments);
            lineSegments = lineSegments.stream().map(OutputLineSegment::reverse).toList();
        }

        return lineSegments;
    }

    /**
     * Converts a special Curve object to its line segments.
     * @param curve Special curve to convert.
     * @param curveToOutputEdge Map from Curve to OutputEdge for each curve that has already been processed.
     * @return Line segments for that curve.
     */
    public List<OutputLineSegment> toLineSegmentsSpecial(Curve curve, HashMap<Curve, OutputEdge> curveToOutputEdge) {
        assert curve.getType().equals("special");
        assert curve.getSpecialCurveInfo() != null;

        if (curve.getSpecialCurveInfo().isSegmentSequence()) {
            return makeSegmentSequenceSpecialCurve(curve);
        } else {
            return joinCurves(curve, curveToOutputEdge);
        }
    }

    /**
     * Generates a parallel edge to an already existing edge.
     * @param parallelCurve Curve that this edge is for.
     * @param parallelTo The edge that the curve is parallel to.
     * @return A parallel edge for that curve.
     */
    public List<OutputLineSegment> makeParallelEdge(Curve parallelCurve, OutputEdge parallelTo) throws IOException, InterruptedException {
        ArrayList<OutputLineSegment> outputLineSegments = new ArrayList<>();

        // todo: optimize so this doesn't just keep doubling edges

        // We take every Bezier curve segment from the edge that this curve is parallel to, and generate a parallel curve.
        List<OutputLineSegment> bezierCurveSegments = parallelTo.getLineSegments().stream()
                .filter(lineSegment -> !lineSegment.isStraightLine()).toList();
        for (OutputLineSegment lineSegment : bezierCurveSegments) {
            List<OutputLineSegment> parallelSegments = makeParallelBezierSegment(lineSegment);

            // Due to small inaccuracies to do with fitting Bezier curves, each set of parallel segments may not line
            // up with each other. When adding a set of parallel segments, we align them up here by moving the
            // endpoint of the last set and the start point of this set to somewhere in the middle.
            if (!outputLineSegments.isEmpty()) {
                Point endOfPrevious = outputLineSegments.get(outputLineSegments.size()-1).getP3();
                Point startOfNext = parallelSegments.get(0).getP0();

                Point midpoint = new Point((endOfPrevious.getX() + startOfNext.getX()) / 2,
                        (endOfPrevious.getY() + startOfNext.getY()) / 2);

                outputLineSegments.get(outputLineSegments.size()-1).setP3(midpoint);
                parallelSegments.get(0).setP0(midpoint);
            }

            outputLineSegments.addAll(parallelSegments);
        }

        // Then, we check if any of the segments in the edge that this curve is parallel to were truncated.
        // If so, they require special handling.
        checkForTruncatedCurves(parallelCurve, parallelCurve.getParallelTo(), bezierCurveSegments, outputLineSegments);
        // Finally, we add back any needed straight line segments at the end.
        extendEndSegments(parallelCurve, outputLineSegments);
        return outputLineSegments;
    }

    /**
     * Checks for whether a Bezier line segment that was used to generate a parallel edge was truncated from the model
     * curve. If so, the endpoint(s) of the parallel curve need to be adjusted so they also perfectly line up with
     * a station.
     * @param parallelCurve The parallel curve, that we are generating line segments for.
     * @param parallelTo The curve that the parallel curve is parallel to.
     * @param bezierSegments The original Bezier segments of the parallelTo curve.
     * @param parallelSegments The parallel Bezier segments that have been generated.
     */
    private static void checkForTruncatedCurves(Curve parallelCurve, Curve parallelTo,
                                                List<OutputLineSegment> bezierSegments,
                                                List<OutputLineSegment> parallelSegments) {
        if (bezierSegments.get(0).getP0().equals(parallelTo.getFrom().toPoint())) {
            parallelSegments.get(0).setP0(parallelCurve.getFrom().toPoint());
        }

        if (bezierSegments.get(bezierSegments.size()-1).getP3().equals(parallelTo.getTo().toPoint())) {
            parallelSegments.get(parallelSegments.size()-1).setP3(parallelCurve.getTo().toPoint());
        }
    }

    /**
     * Extends the end segments of a generated parallel curve with the appropriate straight line segments, if needed.
     * @param parallelCurve The parallel curve, that we are generating line segments for.
     * @param lineSegments The line segments that have been generated for this curve.
     */
    private static void extendEndSegments(Curve parallelCurve, ArrayList<OutputLineSegment> lineSegments) {
        Point fromStation = parallelCurve.getFrom().toPoint();
        Point toStation = parallelCurve.getTo().toPoint();

        // If the endpoints of the segments that have already been generated are at the stations, then there is nothing
        // to do. Otherwise, we need to fill in the gap(s) with straight line segments.
        if (!lineSegments.get(0).getP0().equals(fromStation)) {
            lineSegments.add(0, OutputLineSegment.fromStraightLine(fromStation, lineSegments.get(0).getP0()));
        }

        if (!lineSegments.get(lineSegments.size()-1).getP3().equals(toStation)) {
            lineSegments.add(OutputLineSegment.fromStraightLine(lineSegments.get(lineSegments.size()-1).getP3(), toStation));
        }
    }

    /**
     * Turns a segment sequence special curve into line segments. Takes each segment of the special curve, converts
     * it into a dummy curve, and generates line segments for it. Then, stitches all these parts together to form
     * the overall curve.
     * @param curve A segment sequence special curve.
     * @return Line segments for that curve.
     */
    private List<OutputLineSegment> makeSegmentSequenceSpecialCurve(Curve curve) {
        Stream<Curve> dummyCurves = curve.getSpecialCurveInfo().getSegments().stream().map(
                dummyCurveInfo -> {
                    Station from = dummyCurveInfo.getLeft();
                    Station to = dummyCurveInfo.getMiddle();
                    String type = dummyCurveInfo.getRight();

                    return new Curve(from, to, type, null, null);
                }
        );

        ArrayList<OutputLineSegment> lineSegments = new ArrayList<>();
        dummyCurves.map(this::toLineSegmentsNonSpecial).forEach(lineSegments::addAll);

        return lineSegments;
    }

    /**
     * Turns a 'join of curves' special curve into line segments. Takes every constituent curve and joins them together.
     * @param specialCurve A special curve.
     * @param curveToOutputEdge Map from Curve to OutputEdge for each curve that has already been processed.
     * @return Line segments for the joined curve.
     */
    private List<OutputLineSegment> joinCurves(Curve specialCurve, HashMap<Curve, OutputEdge> curveToOutputEdge) {
        ArrayList<OutputLineSegment> lineSegments = new ArrayList<>();
        specialCurve.getSpecialCurveInfo().getConstituentCurves().forEach(curve ->
                lineSegments.addAll(curveToOutputEdge.get(curve).getLineSegments())
        );
        return lineSegments;
    }

    /** Converts a CSV value of the form "x, y" to a Point. */
    private Point csvToPoint(String csv) {
        String[] values = csv.split(",");
        if (values.length != 2) throw new IllegalArgumentException("R CSV response does not have two columns");

        int x = (int)Math.round(Double.parseDouble(values[0]));
        int y = (int)Math.round(Double.parseDouble(values[1]));
        return new Point(x, y);
    }

    /**
     * Makes a parallel Bezier segment from a Bezier OutputLineSegment. Delegates solving for Bezier control points
     * to an R script. TODO: if this is too slow, batch calls to R to avoid process creation overhead.
     * @param lineSegment A Bezier line segment.
     * @return A number of line segments which run parallel to that Bezier line segment, on the outside.
     */
    private List<OutputLineSegment> makeParallelBezierSegment(OutputLineSegment lineSegment) throws IOException, InterruptedException {
        assert !lineSegment.isStraightLine();

        try (BufferedWriter csvFile = new BufferedWriter(new FileWriter(rCsvInPath))) {
            csvFile.write(String.format("%d, %d", GenerateMap.METRO_LINE_WIDTH, -1));
            csvFile.newLine();
            csvFile.write(String.format("%d, %d", lineSegment.getP0().getX(), lineSegment.getP0().getY()));
            csvFile.newLine();
            csvFile.write(String.format("%d, %d", lineSegment.getP1().getX(), lineSegment.getP1().getY()));
            csvFile.newLine();
            csvFile.write(String.format("%d, %d", lineSegment.getP2().getX(), lineSegment.getP2().getY()));
            csvFile.newLine();
            csvFile.write(String.format("%d, %d", lineSegment.getP3().getX(), lineSegment.getP3().getY()));
            csvFile.newLine();
        }

        Process rProcess = new ProcessBuilder("rscript", "bezier.r").directory(Path.of(rCsvInPath).getParent().toFile()).inheritIO().start();
        if (rProcess.waitFor() != 0) {
            throw new RuntimeException("R process to fit Bezier curves terminated with non-zero exit code.");
        }

        ArrayList<OutputLineSegment> lineSegments = new ArrayList<>();
        try (BufferedReader csvFile = new BufferedReader(new FileReader(rCsvOutPath))) {
            String[] firstCsvLine = csvFile.readLine().split(",");
            if (firstCsvLine.length != 2) throw new IllegalArgumentException("R CSV response does not have two columns");

            int numBezierCurves = Integer.parseInt(firstCsvLine[0]);
            for (int i = 0; i < numBezierCurves; i++) {
                Point p0 = csvToPoint(csvFile.readLine());
                Point p1 = csvToPoint(csvFile.readLine());
                Point p2 = csvToPoint(csvFile.readLine());
                Point p3 = csvToPoint(csvFile.readLine());

                lineSegments.add(OutputLineSegment.fromBezierCurve(p0, p1, p2, p3));
            }
        }

        return lineSegments;
    }

    /**
     * Converts a curve to an equivalent curve with a canonical type.
     * @param curve The curve to convert.
     * @return An equivalent curve, with a canonical type.
     */
    private static Curve toCanonical(Curve curve) {
        if (curve.getType().equals("special")) throw new IllegalArgumentException("Special curves do not have a canonical type.");

        if (ArrayUtils.contains(CANONICAL_CURVE_TYPES, curve.getType())) {
            return curve; // curve is already canonical
        } else {
            // Why this works is best illustrated by trying some examples with pen and paper.
            // First, swap the two tokens, then convert each token to its opposite, and then swap the endpoints.
            String[] curveTypeTokens = curve.getType().split(",");
            String newCurveType = SWAP_DIRECTION.get(curveTypeTokens[1]) + "," + SWAP_DIRECTION.get(curveTypeTokens[0]);
            assert ArrayUtils.contains(CANONICAL_CURVE_TYPES, newCurveType);
            return new Curve(curve.getTo(), curve.getFrom(), newCurveType, null, null);
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

        if (bezierP0.getX() <= station1.getX() || bezierP3.getY() >= station2.getY()) {
            MathUtil.BezierCurve newCurve = truncateBezier(station1, station2,
                    new MathUtil.BezierCurve(bezierP0, bezierP1, bezierP2, bezierP3));
            bezierP0 = newCurve.p0();
            bezierP1 = newCurve.p1();
            bezierP2 = newCurve.p2();
            bezierP3 = newCurve.p3();
        }

        List<OutputLineSegment> segments = new ArrayList<>();

        // If Bezier curve was truncated, its endpoints are at (one or both) stations. Then, if an endpoint is not at
        // a station, it hasn't been truncated - add the straight line segment to fill the gap.

        if (!bezierP0.equals(station1)) {
            segments.add(OutputLineSegment.fromStraightLine(station1, bezierP0));
        }

        segments.add(OutputLineSegment.fromBezierCurve(bezierP0, bezierP1, bezierP2, bezierP3));

        if (!bezierP3.equals(station2)) {
            segments.add(OutputLineSegment.fromStraightLine(bezierP3, station2));
        }

        return segments;
    }

    /**
     * Truncates a Bezier curve. If the Bezier curve extends beyond a station, truncates it to end at the station.
     * This can happen to either or both ends. This function should only be called when an end should actually be
     * truncated.
     * @param station1 First station in the edge.
     * @param station2 Second station in the edge.
     * @param curve The originally generated Bezier curve.
     * @return A truncated Bezier curve.
     */
    private MathUtil.BezierCurve truncateBezier(Point station1, Point station2, MathUtil.BezierCurve curve) {
        if (curve.p0().getX() <= station1.getX()) {
            curve = MathUtil.truncateBezier(station1, curve, false);
        }

        if (curve.p3().getY() >= station2.getY()) {
            curve = MathUtil.truncateBezier(station2, curve, true);
        }

        return curve;
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
        return toSharpCurve(curve.getFrom().toPoint(), curve.getTo().toPoint(), curve.getType());
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

        if (bezierP0.getX() <= station1.getX() || bezierP3.getY() >= station2.getY()) {
            MathUtil.BezierCurve newCurve = truncateBezier(station1, station2,
                    new MathUtil.BezierCurve(bezierP0, bezierP1, bezierP2, bezierP3));
            bezierP0 = newCurve.p0();
            bezierP1 = newCurve.p1();
            bezierP2 = newCurve.p2();
            bezierP3 = newCurve.p3();
        }

        List<OutputLineSegment> segments = new ArrayList<>();

        if (!bezierP0.equals(station1)) {
            segments.add(OutputLineSegment.fromStraightLine(station1, bezierP0));
        }

        segments.add(OutputLineSegment.fromBezierCurve(bezierP0, bezierP1, bezierP2, bezierP3));

        if (!bezierP3.equals(station2)) {
            segments.add(OutputLineSegment.fromStraightLine(bezierP3, station2));
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
                return MathUtil.reflectY(rightDownRightCurve, station1.getY());
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
            case "left,left", "right,right", "down,down", "up,up" -> {
                List<OutputLineSegment> segments = new ArrayList<>();
                segments.add(OutputLineSegment.fromStraightLine(station1, station2));
                return segments;
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
        return toWideCurve(curve.getFrom().toPoint(), curve.getTo().toPoint(), curve.getType());
    }

}
