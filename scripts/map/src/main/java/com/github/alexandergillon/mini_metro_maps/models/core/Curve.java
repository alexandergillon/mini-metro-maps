package com.github.alexandergillon.mini_metro_maps.models.core;

import com.github.alexandergillon.mini_metro_maps.Util;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.stream.IntStream;

/** Represents a curve between two stations. */
@Getter
@AllArgsConstructor
public class Curve {

    /** Station that this curve goes from. */
    private final Station from;

    /** Station that this curve goes to. */
    private final Station to;

    /** Type of this curve. */
    private final String type; // todo: enum?

    /** If this curve has type 'special', this contains information about the curve. Otherwise, is null. */
    private final SpecialCurveInfo specialCurveInfo;

    /**
     * Curve that this curve is parallel to, if any (null otherwise). Null as data is initially read in - is set after
     * all curves have been read in and dependencies can be resolved.
     *
     * Note: it is not guaranteed that cyclic dependencies will be caught. Be careful.
     */
    @Setter
    private Curve parallelTo;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Curve curve = (Curve) o;
        return Objects.equals(from, curve.from) && Objects.equals(to, curve.to) && Objects.equals(type, curve.type);
    }

    @Override
    public int hashCode() {
        return Objects.hash(from, to, type);
    }

    @Override
    public String toString() {
        return String.format("%s ---> %s (%s)", from, to, type);
    }

    /**
     * Class to hold special curve info. A special curve is one of the following two types:
     *
     *   1. Defined by a number of segments between alignment points, where each segment is a normal curve.
     *      E.g. station1 --> station2 by a special curve of:
     *
     *          station1 --> alignment1 --> alignment2 --> alignment3 --> station2
     *
     *      each with their own curve type.
     *
     *   2. A join of previously defined curves. This type of curve 'consumes' the curves that were specified.
     *      E.g. station1 --> aligment1, alignment1 --> alignment2, alignment2 --> station2, which are connected to form:
     *
     *          station1 --> alignment1 --> alignment2 --> alignment3 --> station2
     *
     *      In this case, curve types are not specified: they were already specified when the underlying curves were
     *      defined. This second form is needed to have parts of the special curve run parallel to other curves,
     *      as only normal curves can use 'parallelto'.
     */
    @Getter
    @AllArgsConstructor(access = AccessLevel.PRIVATE)
    public static class SpecialCurveInfo {

        /** Whether this special curve is a point sequence, or a join of other curves. */
        private final boolean segmentSequence;

        /**
         * If this curve is a segment sequence special curve (if isSegmentSequence is true), this contains the curve
         * segments, as described above, as a tuple (fromStation, toStation, curveType).
         */
        private final List<Triple<Station, Station, String>> segments;

        /**
         * If this curve is a join of previously defined curves (if isSegmentSequence is false), this contains the
         * curves that this curve is made up of.
         */
        private final List<Curve> constituentCurves;

        /**
         * Parses text input into a SpecialCurveInfo. Delegates depending on whether it is a segment sequence
         * special curve or join of curves special curve.
         */
        public static SpecialCurveInfo fromText(String inputText, MetroLine currentMetroLine, int textLineNumber) {
            Pair<String, String> firstTokenAndRest = Util.consumeToken(inputText, textLineNumber);
            String firstToken = firstTokenAndRest.getLeft();

            if (firstToken.equals("of")) {
                return joinOfCurvesFromText(inputText, currentMetroLine, textLineNumber);
            } else {
                return segmentSequenceCurveFromText(inputText, currentMetroLine, textLineNumber);
            }
        }

        /**
         * Parses text input into a SpecialCurveInfo for a segment sequence special curve.
         *
         * E.g. new SpecialCurveInfo("\"station1, align1, align2, align3, station2\" \"type1 : type2 : type3 : type4\"", ..., ...)
         *   --> a SpecialCurveInfo with segments = [
         *      (station1, align1, type1), (align1, align2, type2), (align2, align3, type3), (align3, station2, type4)
         *   ]
         */
        private static SpecialCurveInfo segmentSequenceCurveFromText(String inputText, MetroLine currentMetroLine, int textLineNumber) {
            Pair<String, String> doubleQuotedResult1 = Util.consumeDoubleQuoted(inputText, textLineNumber);
            Pair<String, String> doubleQuotedResult2 = Util.consumeDoubleQuoted(doubleQuotedResult1.getRight(), textLineNumber);

            String stationsString = doubleQuotedResult1.getLeft();
            String curveTypesString = doubleQuotedResult2.getLeft();

            List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
            String[] curveTypes = Arrays.stream(curveTypesString.split(":")).map(String::strip).toArray(String[]::new);

            assert stationPairs.size() == curveTypes.length;

            List<Triple<Station, Station, String>> segmentSequence = IntStream.range(0, stationPairs.size())
                .mapToObj(i ->
                    Triple.of(
                            currentMetroLine.getStation(stationPairs.get(i).getLeft(), textLineNumber),
                            currentMetroLine.getStation(stationPairs.get(i).getRight(), textLineNumber),
                            curveTypes[i])
                ).toList();

            return new SpecialCurveInfo(true, segmentSequence, null);
        }

        /**
         * Parses text input into a SpecialCurveInfo for a join of curves special curve.
         *
         * E.g. new SpecialCurveInfo("of \"station1, align1\" \"align, station2\"", ..., ...)
         *   --> a SpecialCurveInfo with constituentCurves = [(station1 --> align), (align --> station2)]
         */
        private static SpecialCurveInfo joinOfCurvesFromText(String inputText, MetroLine currentMetroLine, int textLineNumber) {
            inputText = Util.removePrefix(inputText, "of").strip();

            ArrayList<Curve> constituentCurves = new ArrayList<>();
            // Read all curves in, which are surrounded by double quotes. Eventually, when there are no more curves left,
            // Util.consumeDoubleQuoted() will throw an exception, breaking the while loop.
            try {
                while (true) {
                    Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(inputText, textLineNumber);
                    String[] tokens = Arrays.stream(doubleQuotedResult.getLeft().split(",")).map(String::strip).toArray(String[]::new);
                    if (tokens.length != 2) throw new IllegalArgumentException(String.format("(line %d) Constituent curve in \"special of\" curve is malformed.", textLineNumber));

                    String station1 = tokens[0];
                    String station2 = tokens[1];

                    constituentCurves.add(currentMetroLine.getCurve(station1, station2, textLineNumber));
                    inputText = doubleQuotedResult.getRight();
                }
            } catch (IllegalArgumentException ignored) { } // Exception is to break the loop.

            return new SpecialCurveInfo(false, null, constituentCurves);
        }

    }
}