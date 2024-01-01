package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.core.AlignmentConstraint;
import com.github.alexandergillon.mini_metro_maps.models.core.Curve;
import com.github.alexandergillon.mini_metro_maps.models.core.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.core.Station;
import com.github.alexandergillon.mini_metro_maps.models.core.ZIndexConstraint;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Class to read in data about the metro network. */
public class Parser {

    /** Mapping from metro line name -> MetroLine object. */
    private final HashMap<String, MetroLine> metroLines = new HashMap<>();

    /** Constraints declared in the input file. */
    private final ArrayList<AlignmentConstraint> alignmentConstraints = new ArrayList<>();

    /** Path to the input data file. */
    private final String inputPath;

    /** For getting NAPTANs of stations. */
    private final NaptanReader naptanReader;

    /** Current metro line active in the input file. */
    MetroLine currentMetroLine = null;

    /** Current line of the input being processed, for error messages. */
    private int textLineNumber = 0;

    /** z-index constraints among lines. */
    private final Set<ZIndexConstraint> zIndexConstraints = new HashSet<>();

    /**
     * List of curves which are parallel to other curves, the text which describes who they are parallel to, and the
     * line number that declared them.
     */
    private final ArrayList<Triple<Curve, String, Integer>> parallelCurves = new ArrayList<>();

    /**
     * @param inputPath Path to the input data file.
     * @param naptanFilepath Path to naptan.json.
     */
    public Parser(String inputPath, String naptanFilepath) throws IOException {
        this.inputPath = inputPath;
        naptanReader = new NaptanReader(naptanFilepath);
    }

    /**
     * Throws a formatted IllegalArgumentException. This exists to make many instances of
     * IllegalArgumentException(String.format(...)) more concise.
     */
    private void parseException(String format, Object... args) {
        throw new IllegalArgumentException(String.format(format, args));
    }

    /**
     * @param textLine A line of text input.
     * @return That line with comments removed, and stripped of leading/trailing whitespace.
     */
    private String sanitizeTextLine(String textLine) {
        int commentIndex = textLine.indexOf('#');
        if (commentIndex != -1) {
            textLine = textLine.substring(0, commentIndex);
        }
        textLine = textLine.strip();
        return textLine;
    }

    /**
     * Creates a new metro line in the network. Also returns the metro line that was created.
     * @param textLine line of text input which declares a metro line.
     * @return The new metro line object, which has been added to metroLines.
     */
    private MetroLine createNewMetroLine(String textLine) {
        String[] tokens = textLine.split("\\s+"); // splits on whitespace
        if (tokens.length == 0) parseException("Line %d does not have a metro line name.", textLineNumber);

        String metroLineName = tokens[1];
        int colonIndex = metroLineName.indexOf(':');
        if (colonIndex != -1) {
            metroLineName = metroLineName.substring(0, colonIndex);
        }
        metroLineName = metroLineName.strip();

        if (metroLines.containsKey(metroLineName)) parseException("Redefinition of line %s.", metroLineName);

        MetroLine metroLine = new MetroLine(metroLineName);
        metroLines.put(metroLineName, metroLine);
        return metroLine;
    }

    /**
     * Creates a new station.
     * @param textLine Line of input text which declares a station.
     * @param currentMetroLine The current metro line that is selected in the network.
     * @param isAlignmentPoint Whether this station is actually a station, or just an alignment point for special edges.
     */
    private void createNewStation(String textLine, MetroLine currentMetroLine, boolean isAlignmentPoint) {
        if (currentMetroLine == null) parseException("(line %d) Station declared before a current line was set.", textLineNumber);

        textLine = isAlignmentPoint ? Util.removePrefix(textLine, "alignment-point")
                : Util.removePrefix(textLine, "station").strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationName = doubleQuotedResult.getLeft().strip();
        String textRest = doubleQuotedResult.getRight().strip();

        String[] tokens = textRest.split("\\s+");
        if (tokens.length != 2) parseException("(line %d) Station declaration does not have both coordinates, or has trailing text.", textLineNumber);

        int x, y;
        try {
            x = Integer.parseInt(tokens[0]);
            y = Integer.parseInt(tokens[1]);
        } catch (NumberFormatException ignored) {
            // Can't use parseException or compiler cannot prove that x and y are initialized.
            throw new IllegalArgumentException(String.format("(line %d) Station declaration contains coordinate which is not an integer.", textLineNumber));
        }

        // todo: maybe move ampl id out here
        String naptan = isAlignmentPoint ? "alignmentpoint_" + stationName
                : naptanReader.getNaptan(currentMetroLine.getName(), stationName);
        Station station = new Station(currentMetroLine.getName(), stationName, naptan, x, y, isAlignmentPoint);
        currentMetroLine.addStation(station);
    }

    /**
     * Adds a number of edges between two stations on a line.
     * @param textLine Line of input text which declares a number of edges.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void addEdges(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) parseException("(line %d) Edges declared before a current line was set.", textLineNumber);

        textLine = Util.removePrefix(textLine, "edges").strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft().strip();

        List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
        for (Pair<String, String> stationPair : stationPairs) {
            currentMetroLine.addEdge(stationPair.getLeft(), stationPair.getRight(), textLineNumber);
        }
    }

    /**
     * Validates a curve type.
     * @param curveType The curve type to validate.
     */
    private void validateCurveType(String curveType) {
        if (!curveType.equals("special")) {
            String[] curveTypeTokens = curveType.split(",");
            if (curveTypeTokens.length != 2) parseException("(line %d) Invalid curve type \"%s\".", textLineNumber, curveType);

            String[] validTokens = {"up", "down", "left", "right", "up-right", "up-left", "down-right", "down-left"};
            if (!ArrayUtils.contains(validTokens, curveTypeTokens[0]) || !ArrayUtils.contains(validTokens, curveTypeTokens[1])) {
                parseException("(line %d) Invalid curve type \"%s\".", textLineNumber, curveType);
            }
        }
    }

    /**
     * Process a 'parallelto' clause in a curve declaration. For now, adds it to the map of parallel curves - these
     * dependencies can only be resolved when all curves have been read in.
     * @param inputText Text that represents a parallelto clause.
     * @param curve The curve that was declared with this 'parallelto' clause.
     */
    private void processParallelTo(String inputText, Curve curve) {
        Pair<String, String> keywordAndRest = Util.consumeToken(inputText, textLineNumber);
        String keyword = keywordAndRest.getLeft();
        String textRest = keywordAndRest.getRight();

        if (!keyword.equals("parallelto")) parseException("(line %d) Unrecognized trailing text on curve declaration.", textLineNumber);

        parallelCurves.add(Triple.of(curve, textRest, textLineNumber));
    }

    /**
     * Adds a curve between two stations.
     * @param textLine Line of input text which declares a curve.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void addCurve(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) parseException("(line %d) Curve declared before a current line was set.", textLineNumber);

        textLine = Util.removePrefix(textLine, "curve").strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft().strip();
        String textRest = doubleQuotedResult.getRight().strip();

        Pair<String, String> curveTypeAndRest = Util.consumeToken(textRest, textLineNumber);
        String curveType = curveTypeAndRest.getLeft();
        textRest = curveTypeAndRest.getRight();

        String[] stations = Arrays.stream(stationsString.split(",")).map(String::strip).toArray(String[]::new);
        validateCurveType(curveType);

        if (stations.length != 2) parseException("(line %d) Curve declaration does not have two stations.", textLineNumber);

        Curve.SpecialCurveInfo specialCurveInfo = curveType.equals("special") ?
                Curve.SpecialCurveInfo.fromText(textRest, currentMetroLine, textLineNumber) : null;
        Curve curve = currentMetroLine.addCurve(stations[0], stations[1], curveType, specialCurveInfo, textLineNumber);

        if (!textRest.isEmpty()) {
            try {
                processParallelTo(textRest, curve);
            } catch (IllegalArgumentException e) {
                // Curve has trailing text which is not 'parallelto'. If the curve is 'special', that is ok.
                if (!curveType.equals("special")) {
                    throw e;
                }
            }
        }
    }

    /**
     * Adds an endpoint to a metro line.
     * @param textLine Line of input text which declares an endpoint.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void addEndpoint(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) parseException("(line %d) Endpoint declared before a current line was set.", textLineNumber);

        textLine = Util.removePrefix(textLine, "endpoint").strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationString = doubleQuotedResult.getLeft().strip();
        String textRest = doubleQuotedResult.getRight().strip();

        currentMetroLine.addEndpoint(stationString, textRest, textLineNumber);
    }

    /**
     * Adds a z-index constraint between two lines.
     * @param textLine Line of input text which declares a z-index constraint.
     */
    private void addZIndexConstraint(String textLine) {
        textLine = Util.removePrefix(textLine, "zindex").strip();
        String[] tokens = textLine.split("\\s+");

        if (tokens.length != 3) parseException("(line %d) z-index constraint declaration is invalid.", textLineNumber);

        String metroLineName1 = tokens[0];
        String constraintType = tokens[1];
        String metroLineName2 = tokens[2];

        switch (constraintType) {
            case "above" -> zIndexConstraints.add(new ZIndexConstraint(metroLineName1, metroLineName2));
            case "below" -> zIndexConstraints.add(new ZIndexConstraint(metroLineName2, metroLineName1));
            default -> parseException("(line %d) Bad z-index constraint type \"%s\".", textLineNumber, constraintType);
        }
    }

    /**
     * Processes a sanitized line of input text.
     * @param textLine The line of input text to process.
     */
    private void processInputLine(String textLine) {
        if (textLine.startsWith("line")) {
            currentMetroLine = createNewMetroLine(textLine);
        } else if (textLine.startsWith("station")) {
            createNewStation(textLine, currentMetroLine, false);
        } else if (textLine.startsWith("alignment-point")) {
            createNewStation(textLine, currentMetroLine, true);
        } else if (textLine.startsWith("edges")) {
            addEdges(textLine, currentMetroLine);
        } else if (textLine.startsWith("curve")) {
            addCurve(textLine, currentMetroLine);
        } else if (textLine.startsWith("multi-line")) {
            currentMetroLine = null;
        } else if (Util.startsWithAny(textLine, new String[]{"vertical", "horizontal", "up-right", "up-left", "down-right", "down-left"})) {
            textLine = textLine.replace("up-left", "down-right");
            textLine = textLine.replace("down-left", "up-right");
            alignmentConstraints.add(new AlignmentConstraint(textLine, currentMetroLine, textLineNumber));
        } else if (Util.startsWithAny(textLine, new String[]{"same-station", "equal"})) {
            alignmentConstraints.add(new AlignmentConstraint(textLine, currentMetroLine, textLineNumber));
        } else if (textLine.startsWith("endpoint")) {
            addEndpoint(textLine, currentMetroLine);
        } else if (textLine.startsWith("zindex")) {
            addZIndexConstraint(textLine);
        } else {
            System.out.printf("(line %d) Warning: line with unrecognized form. Ignoring.%n", textLineNumber);
        }
    }

    /**
     * Reads data about metro lines/stations from the input file. Puts information into the `metroLines` and
     * `constraints` member variables.
     */
    private void readData() throws IOException {
        try (BufferedReader bufferedReader = new BufferedReader(new FileReader(inputPath))) {
            String textLine;
            textLineNumber = 0;
            while ((textLine = bufferedReader.readLine()) != null) {
                textLineNumber++;
                textLine = sanitizeTextLine(textLine);
                if (textLine.isEmpty()) continue;

                processInputLine(textLine);
            }
        }
    }

    /** Checks that all lines have no orphans. */
    private void checkNoOrphans() {
        for (MetroLine metroLine : metroLines.values()) {
            metroLine.assertNoOrphanStations();
        }
    }

    /** Resolves a curve specifier (e.g. "picadilly: Northfields, South Ealing" to a curve object. */
    private Curve resolveCurve(String curveSpecifier) {
        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(curveSpecifier, textLineNumber);

        String[] tokens = doubleQuotedResult.getLeft().split(":");
        if (tokens.length != 2) parseException("(line %d) Unrecognized trailing text on curve declaration.", textLineNumber);

        String[] stations = tokens[1].split(",");
        if (stations.length != 2) parseException("(line %d) Unrecognized trailing text on curve declaration.", textLineNumber);

        String metroLineName = tokens[0].strip();
        String station1 = stations[0].strip();
        String station2 = stations[1].strip();

        if (!metroLines.containsKey(metroLineName)) parseException("(line %d) Unrecognized trailing text on curve declaration.", textLineNumber);

        return metroLines.get(metroLineName).getCurve(station1, station2, textLineNumber);
    }

    /**
     * Resolves a curve with the same 'from' and 'to' stations on a different line.
     * @param curve A curve.
     * @param metroLineName A line name.
     * @return A curve on that line, with the same 'from' and 'to' stations as the curve.
     */
    private Curve resolveCurve(Curve curve, String metroLineName) {
        if (!metroLines.containsKey(metroLineName)) parseException("(line %d) Unrecognized trailing text on curve declaration.", textLineNumber);

        Curve otherCurve = metroLines.get(metroLineName).getCurve(curve.getFrom().getName(), curve.getTo().getName(), textLineNumber);

        if (!otherCurve.getType().equals(curve.getType())) {
            parseException("(line %d) Curve with type %s declared to be dependent on curve with type %s.",
                    textLineNumber, curve.getType(), otherCurve.getType());
        }

        return otherCurve;
    }

    /** Resolves all curve dependencies (sets the Curve.parallelTo field for all curves appropriately). */
    private void resolveCurveDependencies() {
        for (Triple<Curve, String, Integer> dependency : parallelCurves) {
            Curve curve = dependency.getLeft();
            String parallelToText = dependency.getMiddle();
            textLineNumber = dependency.getRight();

            Pair<String, String> firstTokenAndRest = Util.consumeToken(parallelToText, textLineNumber);
            String firstToken = firstTokenAndRest.getLeft();
            String textRest = firstTokenAndRest.getRight().strip();

            // If the first token is 'curve' - read the curve from a double-quoted string. Otherwise, the first
            // token is the line name of a line that has the exact same curve as this (between same stations, same
            // direction, etc.).
            Curve parallelTo = firstToken.equals("curve") ? resolveCurve(textRest) : resolveCurve(curve, firstToken);
            curve.setParallelTo(parallelTo);
        }
    }

    /**
     * Parses data from the input file.
     * @return A triple of the following:
     *   - A mapping from metro line name -> MetroLine object.
     *   - A list of alignment constraints.
     *   - A list of z-index constraints.
     */
    public Triple<Map<String, MetroLine>, List<AlignmentConstraint>, Set<ZIndexConstraint>> parseData() throws IOException {
        System.out.println("Parsing input data.");
        readData();
        checkNoOrphans();
        resolveCurveDependencies();
        return Triple.of(metroLines, alignmentConstraints, zIndexConstraints);
    }
}
