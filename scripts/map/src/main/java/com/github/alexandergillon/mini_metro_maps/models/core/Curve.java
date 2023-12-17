package com.github.alexandergillon.mini_metro_maps.models.core;

import com.github.alexandergillon.mini_metro_maps.Util;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;

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
     * Curve that this curve depends on, if any (null otherwise). Null as data is initially read in - is set after
     * all curves have been read in and dependencies can be resolved.
     *
     * Note: no checking is done for cyclic dependencies. Be careful.
     */
    @Setter
    private Curve dependentOn;

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
     * Class to hold special curve info. A special curve is defined by a number of segments between alignment points,
     * where each segment is a normal curve.
     *
     * E.g. station1 --> station2 by a special curve of station1 --> alignment1 --> alignment2 --> alignment3 --> station2,
     * each with their own curve type.
     */
    @Getter
    public static class SpecialCurveInfo {

        /** The special curve segments, as described above, as a tuple (fromStation, toStation, curveType). */
        private final List<Triple<Station, Station, String>> pointSequence;

        /**
         * Parses text input into a SpecialCurveInfo.
         *
         * E.g. new SpecialCurveInfo("station1, align1, align2, align3, station2" "type1 : type2 : type3 : type4", ..., ...)
         *   --> a SpecialCurveInfo with pointSequence = [
         *      (station1, align1, type1), (align1, align2, type2), (align2, align3, type3), (align3, station2, type4)
         *   ]
         * */
        public SpecialCurveInfo(String inputText, MetroLine currentMetroLine, int textLineNumber) {
            Pair<String, String> doubleQuotedResult1 = Util.consumeDoubleQuoted(inputText, textLineNumber);
            Pair<String, String> doubleQuotedResult2 = Util.consumeDoubleQuoted(doubleQuotedResult1.getRight(), textLineNumber);

            String stationsString = doubleQuotedResult1.getLeft();
            String curveTypesString = doubleQuotedResult2.getLeft();

            List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
            String[] curveTypes = Arrays.stream(curveTypesString.split(":")).map(String::strip).toArray(String[]::new);

            assert stationPairs.size() == curveTypes.length;

            pointSequence = IntStream.range(0, stationPairs.size()).mapToObj(i ->
                Triple.of(
                        currentMetroLine.getStation(stationPairs.get(i).getLeft(), textLineNumber),
                        currentMetroLine.getStation(stationPairs.get(i).getRight(), textLineNumber),
                        curveTypes[i])
            ).toList();
        }

    }
}