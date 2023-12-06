package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.Constraint;
import com.github.alexandergillon.mini_metro_maps.models.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.Station;
import com.github.alexandergillon.mini_metro_maps.models.Util;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.commons.lang3.tuple.Pair;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Class to read in data about the metro network. */
public class Parser {

    /** Mapping from metro line name -> MetroLine object. */
    private final HashMap<String, MetroLine> metroLines = new HashMap<>();

    /** Constraints declared in the input file. */
    private final ArrayList<Constraint> constraints = new ArrayList<>();

    /** Path to the input data file. */
    private final String inputPath;

    /** For getting NAPTANs of stations. */
    private final NaptanReader naptanReader;

    /** Current line of the input being processed, for error messages. */
    private int textLineNumber = 0;

    /**
     * @param inputPath Path to the input data file.
     * @param naptanFilepath Path to naptan.json.
     */
    public Parser(String inputPath, String naptanFilepath) {
        this.inputPath = inputPath;
        naptanReader = new NaptanReader(naptanFilepath);
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
        if (tokens.length == 0) {
            throw new IllegalArgumentException(String.format("Line %d does not have a metro line name.", textLineNumber));
        }

        String metroLineName = tokens[1];
        int colonIndex = metroLineName.indexOf(':');
        if (colonIndex != -1) {
            metroLineName = metroLineName.substring(0, colonIndex);
        }
        metroLineName = metroLineName.strip();

        if (metroLines.containsKey(metroLineName)) {
            throw new IllegalArgumentException(String.format("Redefinition of line %s.", metroLineName));
        }

        MetroLine metroLine = new MetroLine(metroLineName);
        metroLines.put(metroLineName, metroLine);
        return metroLine;
    }

    /**
     * Creates a new station.
     * @param textLine Line of input text which declares a station.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void createNewStation(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) {
            throw new IllegalArgumentException(String.format("(line %d) Station declared before a current line was set.", textLineNumber));
        }

        textLine = Util.removePrefix(textLine, "station");
        textLine = textLine.strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationName = doubleQuotedResult.getLeft();
        String textRest = doubleQuotedResult.getRight();
        stationName = stationName.strip();
        textRest = textRest.strip();

        String[] tokens = textRest.split("\\s+");
        if (tokens.length != 2) {
            throw new IllegalArgumentException(String.format("(line %d) Station declaration does not have both coordinates, or has trailing text.", textLineNumber));
        }

        int x, y;
        try {
            x = Integer.parseInt(tokens[0]);
            y = Integer.parseInt(tokens[1]);
        } catch (NumberFormatException ignored) {
            throw new IllegalArgumentException(String.format("(line %d) Station declaration contains coordinate which is not an integer.", textLineNumber));
        }

        String naptan = naptanReader.getNaptan(stationName);
        Station station = new Station(currentMetroLine.getName(), stationName, naptan, x, y);
        currentMetroLine.addStation(station);
    }

    /**
     * Adds a number of edges between two stations on a line.
     * @param textLine Line of input text which declares a number of edges.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void addEdges(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) {
            throw new IllegalArgumentException(String.format("(line %d) Edges declared before a current line was set.", textLineNumber));
        }

        textLine = Util.removePrefix(textLine, "edges");
        textLine = textLine.strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft();
        stationsString = stationsString.strip();

        List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
        for (Pair<String, String> stationPair : stationPairs) {
            currentMetroLine.addEdge(stationPair.getLeft(), stationPair.getRight(), textLineNumber);
        }
    }

    /**
     * Extracts the curve type from a line of input and validates it.
     * @param textInput The part of the text input that declares a curve type.
     * @return The extracted curve type.
     */
    private String getCurveType(String textInput) {
        String[] tokens = textInput.split("\\s+");
        if (tokens.length != 1) {
            throw new IllegalArgumentException(String.format("(line %d) Invalid curve type \"%s\".", textLineNumber, textInput));
        }

        String curveType = tokens[0];
        if (!curveType.equals("special")) {
            String[] curveTypeTokens = curveType.split(",");
            if (curveTypeTokens.length != 2) {
                throw new IllegalArgumentException(String.format("(line %d) Invalid curve type \"%s\".", textLineNumber, textInput));
            }

            String[] validTokens = {"up", "down", "left", "right", "up-right", "up-left", "down-right", "down-left"};
            if (!ArrayUtils.contains(validTokens, curveTypeTokens[0]) || !ArrayUtils.contains(validTokens, curveTypeTokens[1])) {
                throw new IllegalArgumentException(String.format("(line %d) Invalid curve type \"%s\".", textLineNumber, textInput));
            }
        }

        return curveType;
    }

    /**
     * Adds a curve between two stations.
     * @param textLine Line of input text which declares a curve.
     * @param currentMetroLine The current metro line that is selected in the network.
     */
    private void addCurve(String textLine, MetroLine currentMetroLine) {
        if (currentMetroLine == null) {
            throw new IllegalArgumentException(String.format("(line %d) Curve declared before a current line was set.", textLineNumber));
        }

        textLine = Util.removePrefix(textLine, "curve");
        textLine = textLine.strip();

        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(textLine, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft();
        String textRest = doubleQuotedResult.getRight();
        stationsString = stationsString.strip();
        textRest = textRest.strip();

        String curveType = getCurveType(textRest);
        String[] stations = stationsString.split(",");
        stations = Arrays.stream(stations).map(String::strip).toArray(String[]::new); // some day, mapping a collection in Java won't be ugly

        if (stations.length != 2) {
            throw new IllegalArgumentException(String.format("(line %d) Curve declaration does not have two stations.", textLineNumber));
        }

        currentMetroLine.addCurve(stations[0], stations[1], curveType, textLineNumber);
    }

    /**
     * Reads data about metro lines/stations from the input file. Puts information into the `metroLines` and
     * `constraints` member variables.
     */
    private void readData() throws IOException {
        try (BufferedReader bufferedReader = new BufferedReader(new FileReader(inputPath))) {
            MetroLine currentMetroLine = null;
            String textLine;
            textLineNumber = 0;
            while ((textLine = bufferedReader.readLine()) != null) {
                textLineNumber++;
                textLine = sanitizeTextLine(textLine);
                if (textLine.isEmpty()) continue;

                if (textLine.startsWith("line")) {
                    currentMetroLine = createNewMetroLine(textLine);
                } else if (textLine.startsWith("station")) {
                    createNewStation(textLine, currentMetroLine);
                } else if (textLine.startsWith("edges")) {
                    addEdges(textLine, currentMetroLine);
                } else if (textLine.startsWith("curve")) {
                    addCurve(textLine, currentMetroLine);
                } else if (textLine.startsWith("multi-line")) {
                    currentMetroLine = null;
                } else if (Util.startsWithAny(textLine, new String[]{"vertical", "horizontal", "up-right", "up-left", "down-right", "down-left"})) {
                    textLine = textLine.replace("up-left", "down-right");
                    textLine = textLine.replace("down-left", "up-right");
                    constraints.add(new Constraint(textLine, currentMetroLine, textLineNumber));
                } else if (Util.startsWithAny(textLine, new String[]{"same-station", "equal"})) {
                    constraints.add(new Constraint(textLine, currentMetroLine, textLineNumber));
                } else {
                    throw new IllegalArgumentException(String.format("(line %d) Line with unrecognized form.", textLineNumber));
                }
            }
        }
    }

    /** Checks that all lines have no orphans. */
    private void checkNoOrphans() {
        for (MetroLine metroLine : metroLines.values()) {
            metroLine.assertNoOrphanStations();
        }
    }

    /**
     * Parses data from the input file.
     * @return A pair of the following:
     *   - A mapping from metro line name -> MetroLine object.
     *   - A list of constraints.
     */
    public Pair<Map<String, MetroLine>, List<Constraint>> parseData() throws IOException {
        readData();
        checkNoOrphans();
        return Pair.of(metroLines, constraints);
    }
}
