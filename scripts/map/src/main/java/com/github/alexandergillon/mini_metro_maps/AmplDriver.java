package com.github.alexandergillon.mini_metro_maps;

import com.ampl.AMPL;
import com.github.alexandergillon.mini_metro_maps.models.core.Constraint;
import com.github.alexandergillon.mini_metro_maps.models.core.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.core.Station;
import org.apache.commons.lang3.tuple.Pair;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/** Class to interact with AMPL. */
public class AmplDriver {

    /** Path to the initial AMPL model file. */
    private final String initialModelPath;

    /** AMPL model file. */
    private BufferedWriter amplModFile;

    /** AMPL data file. */
    private BufferedWriter amplDatFile;

    /** Scale factor for the map. */
    private final int scaleFactor;

    /** Line width of a metro line on the map, in pixels. */
    private final int metroLineWidth;

    /** X/Y offset of two stations that are diagonally adjacent. */
    private final int diagonalOffset;

    /**
     * @param initialModelPath Path to the initial AMPL model file.
     */
    public AmplDriver(String initialModelPath, int scaleFactor, int metroLineWidth) {
        this.initialModelPath = initialModelPath;
        this.scaleFactor = scaleFactor;
        this.metroLineWidth = metroLineWidth;
        this.diagonalOffset = (int)Math.floor(((double)metroLineWidth) / Math.sqrt(2));
    }

    /**
     * Writes the initial part of the .mod file. This comes from a base template, which needs to have a % replaced
     * with station identifiers.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    private void writeInitialModel(Map<String, MetroLine> metroLines) throws IOException {
        String initialModelText = Files.readString(Path.of(initialModelPath));
        int percentIndex = initialModelText.indexOf('%');
        if (percentIndex == -1) {
            throw new IllegalArgumentException("Cannot find % in initial AMPL model file.");
        }

        amplModFile.write(initialModelText.substring(0, percentIndex));

        ArrayList<String> stationIdentifiers = new ArrayList<>();
        for (MetroLine metroLine : metroLines.values()) {
            for (Station station : metroLine.getStations().values()) {
                stationIdentifiers.add(String.format("\"%s\"", station.getAmplUniqueId()));
            }
        }

        amplModFile.write(String.join(", ", stationIdentifiers));
        amplModFile.write(initialModelText.substring(percentIndex+1));
        amplModFile.newLine();
    }

    /**
     * Writes a vertical constraint between two stations to the .mod file.
     * I.e. the two stations lie on the same vertical.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeVerticalConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to vertical_%s_%s: SOLVED_X_COORDS[\"%s\"] = SOLVED_X_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a horizontal constraint between two stations to the .mod file.
     * I.e. the two stations lie on the same horizontal.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeHorizontalConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to horizontal_%s_%s: SOLVED_Y_COORDS[\"%s\"] = SOLVED_Y_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a rising diagonal constraint between two stations to the .mod file.
     * I.e. the two stations lie on the same rising diagonal.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeRisingDiagonalConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to rising_diagonal_%s_%s: SOLVED_X_COORDS[\"%s\"] - SOLVED_X_COORDS[\"%s\"] " +
                "= -(SOLVED_Y_COORDS[\"%s\"] - SOLVED_Y_COORDS[\"%s\"]);", station1Id, station2Id,
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a falling diagonal constraint between two stations to the .mod file.
     * I.e. the two stations lie on the same falling diagonal.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeFallingDiagonalConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to falling_diagonal_%s_%s: SOLVED_X_COORDS[\"%s\"] - SOLVED_X_COORDS[\"%s\"] " +
                "= SOLVED_Y_COORDS[\"%s\"] - SOLVED_Y_COORDS[\"%s\"];", station1Id, station2Id,
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
    }

    /**
     * Extracts the metro line name and station name from a string of the form "line: name".
     * E.g. extractMetroLine("lineName: stationName") --> ("lineName", "stationName")
     * @param stationNameWithMetroLine Station name with metro line prepended, seperated by a colon.
     * @param textLineNumber Line number of the input which declared this station.
     * @return The metro line name, and station name, as a pair.
     */
    private static Pair<String, String> extractMetroLine(String stationNameWithMetroLine, int textLineNumber) {
        String[] tokens = stationNameWithMetroLine.split(":");
        if (tokens.length != 2) {
            throw new IllegalArgumentException(String.format("(line %d) Invalid station name (\"lineName: stationName\" expected).", textLineNumber));
        }

        String metroLineName = tokens[0];
        String stationName = tokens[1];
        metroLineName = metroLineName.strip();
        stationName = stationName.strip();
        return Pair.of(metroLineName, stationName);
    }

    /**
     * Writes a cardinal direction constraint between two stations (a vertical, horizontal, or rising/falling diagonal constraint).
     * @param station1Name Name of the first station.
     * @param station2Name Name of the second station.
     * @param constraintType Type of the constraint (one of 'vertical', 'horizontal', 'up-right', 'down-right').
     * @param metroLine The metro line of these stations in the network. If null, to be read from each station.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     */
    private void writeCardinalDirectionConstraint(String station1Name, String station2Name, String constraintType,
                                                  MetroLine metroLine, Map<String, MetroLine> metroLines,
                                                  int textLineNumber) throws IOException {
        String station1Id;
        String station2Id;
        if (metroLine == null) {
            Pair<String, String> lineAndName1 = extractMetroLine(station1Name, textLineNumber);
            Pair<String, String> lineAndName2 = extractMetroLine(station2Name, textLineNumber);
            station1Id = metroLines.get(lineAndName1.getLeft()).getStation(lineAndName1.getRight(), textLineNumber).getAmplUniqueId();
            station2Id = metroLines.get(lineAndName2.getLeft()).getStation(lineAndName2.getRight(), textLineNumber).getAmplUniqueId();
        } else {
            station1Id = metroLine.getStation(station1Name, textLineNumber).getAmplUniqueId();
            station2Id = metroLine.getStation(station2Name, textLineNumber).getAmplUniqueId();
        }

        switch (constraintType) {
            case "vertical" -> writeVerticalConstraint(station1Id, station2Id);
            case "horizontal" -> writeHorizontalConstraint(station1Id, station2Id);
            case "up-right" -> writeRisingDiagonalConstraint(station1Id, station2Id);
            case "down-right" -> writeFallingDiagonalConstraint(station1Id, station2Id);
            default -> throw new IllegalArgumentException(String.format("Constraint (line %d) is invalid. Earlier code should have already validated this.", textLineNumber));
        }
    }

    /**
     * Processes a line of text which represents a cardinal direction constraint (a vertical, horizontal, or
     * rising/falling diagonal constraint).
     * @param inputText The input text which declares the constraint, with the constraint type removed.
     * @param constraintType Type of the constraint (one of 'vertical', 'horizontal', 'up-right', 'down-right').
     * @param metroLine The metro line in the network of any stations referred to in the constraint. If null, to be read from each station.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     */
    private void processCardinalDirectionConstraint(String inputText, String constraintType, MetroLine metroLine,
                                                    Map<String, MetroLine> metroLines, int textLineNumber) throws IOException {
        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(inputText, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft();
        stationsString = stationsString.strip();

        List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
        for (Pair<String, String> stationPair : stationPairs) {
            writeCardinalDirectionConstraint(stationPair.getLeft(), stationPair.getRight(), constraintType, metroLine, metroLines, textLineNumber);
        }
    }

    /**
     * Writes a 'same station' constraint between two stations, where one is directly above the other, to the .mod file.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeSameStationAboveConstraint(String station1Id, String station2Id) throws IOException {
        writeVerticalConstraint(station1Id, station2Id);
        amplModFile.write(String.format("subject to same_station_above_%s_%s: SOLVED_Y_COORDS[\"%s\"] + %d = SOLVED_Y_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, metroLineWidth, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a 'same station' constraint between two stations, where one is directly left of the other, to the .mod file.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeSameStationLeftConstraint(String station1Id, String station2Id) throws IOException {
        writeHorizontalConstraint(station1Id, station2Id);
        amplModFile.write(String.format("subject to same_station_left_%s_%s: SOLVED_X_COORDS[\"%s\"] + %d = SOLVED_X_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, metroLineWidth, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a 'same station' constraint between two stations, where one is directly above and to the right of the other, to the .mod file.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeSameStationAboveRightConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to same_station_above_right_above_%s_%s: SOLVED_Y_COORDS[\"%s\"] + %d = SOLVED_Y_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, diagonalOffset, station2Id));
        amplModFile.newLine();
        amplModFile.write(String.format("subject to same_station_above_right_right_%s_%s: SOLVED_X_COORDS[\"%s\"] - %d = SOLVED_X_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, diagonalOffset, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a 'same station' constraint between two stations, where one is directly above and to the left of the other, to the .mod file.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeSameStationAboveLeftConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to same_station_above_left_above_%s_%s: SOLVED_Y_COORDS[\"%s\"] + %d = SOLVED_Y_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, diagonalOffset, station2Id));
        amplModFile.newLine();
        amplModFile.write(String.format("subject to same_station_above_left_left_%s_%s: SOLVED_X_COORDS[\"%s\"] + %d = SOLVED_X_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, diagonalOffset, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a 'same station' constraint between two stations, where both are in the exact same location, to the .mod file.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     */
    private void writeSameStationEqualConstraint(String station1Id, String station2Id) throws IOException {
        amplModFile.write(String.format("subject to same_station_equal_x_%s_%s: SOLVED_X_COORDS[\"%s\"] = SOLVED_X_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
        amplModFile.write(String.format("subject to same_station_equal_y_%s_%s: SOLVED_Y_COORDS[\"%s\"] = SOLVED_Y_COORDS[\"%s\"];",
                station1Id, station2Id, station1Id, station2Id));
        amplModFile.newLine();
    }

    /**
     * Writes a 'same station' constraint between two stations.
     * @param station1Id Identifier of the first station, in the STATIONS AMPL set.
     * @param station2Id Identifier of the second station, in the STATIONS AMPL set.
     * @param constraintDirection Direction of the same-station constraint (one of "above", "below", "left", "right",
     *                            "above-left", "above-right", "below-left", "below-right", "equal").
     */
    private void writeSameStationConstraint(String station1Id, String station2Id, String constraintDirection) throws IOException {
        // Only need 4 underlying constraint types, as we can reverse the order of station1 and station2
        switch (constraintDirection) {
            case "above" -> writeSameStationAboveConstraint(station1Id, station2Id);
            case "below" -> writeSameStationAboveConstraint(station2Id, station1Id);

            case "left" -> writeSameStationLeftConstraint(station1Id, station2Id);
            case "right" -> writeSameStationLeftConstraint(station2Id, station1Id);

            case "above-right" -> writeSameStationAboveRightConstraint(station1Id, station2Id);
            case "below-left" -> writeSameStationAboveRightConstraint(station2Id, station1Id);

            case "above-left" -> writeSameStationAboveLeftConstraint(station1Id, station2Id);
            case "below-right" -> writeSameStationAboveLeftConstraint(station2Id, station1Id);

            case "exact" -> writeSameStationEqualConstraint(station1Id, station2Id);

            default -> throw new IllegalArgumentException(String.format("Unrecognized same-station constraint direction %s.", constraintDirection));
        }
    }

    /**
     * Processes a line of text which represents a 'same station' constraint. This is two stations that are directly
     * adjacent on the map (usually representing multiple metro lines which stop at the same station).
     * @param inputText The input text which declares the constraint, with "same-station" removed.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     */
    private void processSameStationConstraint(String inputText, Map<String, MetroLine> metroLines, int textLineNumber) throws IOException {
        if (inputText.charAt(0) == '"') {
            // line is of the form "same-station \"line1Name: station1Name\" dir \"line2Name: station2Name\""
            Pair<String, String> station1Result = Util.consumeDoubleQuoted(inputText, textLineNumber);
            Pair<String, String> directionResult = Util.consumeToken(station1Result.getRight(), textLineNumber);
            Pair<String, String> station2Result = Util.consumeDoubleQuoted(directionResult.getRight(), textLineNumber);

            Pair<String, String> lineAndName1 = extractMetroLine(station1Result.getLeft(), textLineNumber);
            String constraintDirection = directionResult.getLeft();
            Pair<String, String> lineAndName2 = extractMetroLine(station2Result.getLeft(), textLineNumber);

            String station1Id = metroLines.get(lineAndName1.getLeft())
                    .getStation(lineAndName1.getRight(), textLineNumber).getAmplUniqueId();
            String station2Id = metroLines.get(lineAndName2.getLeft())
                    .getStation(lineAndName2.getRight(), textLineNumber).getAmplUniqueId();

            writeSameStationConstraint(station1Id, station2Id, constraintDirection);
        } else {
            // line is of the form "same-station line1Name dir line2Name \"station1, station2, ...\""
            Pair<String, String> token1Result = Util.consumeToken(inputText, textLineNumber);
            Pair<String, String> token2Result = Util.consumeToken(token1Result.getRight(), textLineNumber);
            Pair<String, String> token3Result = Util.consumeToken(token2Result.getRight(), textLineNumber);

            String line1Name = token1Result.getLeft();
            String constraintDirection = token2Result.getLeft();
            String line2Name = token3Result.getLeft();

            Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(token3Result.getRight(), textLineNumber);
            String stationsString = doubleQuotedResult.getLeft();
            stationsString = stationsString.strip();
            String[] stations = stationsString.split(",");
            stations = Arrays.stream(stations).map(String::strip).toArray(String[]::new); // some day, mapping a collection in Java won't be ugly

            for (String stationName : stations) {
                String station1Id = metroLines.get(line1Name).getStation(stationName, textLineNumber).getAmplUniqueId();
                String station2Id = metroLines.get(line2Name).getStation(stationName, textLineNumber).getAmplUniqueId();
                writeSameStationConstraint(station1Id, station2Id, constraintDirection);
            }
        }
    }

    /**
     * Processes a summand from how it appears in the input file to how it should appear in the AMPL file.
     * E.g. processSummand("district: Embankment.x") --> "SOLVED_X_COORDS[AMPL ID]" for the appropriate AMPL ID.
     * @param summand The summand to process.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     * @return The processed summand.
     */
    private static String processSummand(String summand, Map<String, MetroLine> metroLines, int textLineNumber) {
        Pair<String, String> lineAndName = extractMetroLine(summand, textLineNumber);
        String metroLineName = lineAndName.getLeft().strip();
        String stationNameWithXOrY = lineAndName.getRight().strip();

        String[] stationNameTokens = stationNameWithXOrY.split("\\."); // splits on the symbol .
        if (stationNameTokens.length != 2) {
            throw new IllegalArgumentException(String.format("(line %d) Malformed station \"%s\" in equal expression.",
                    textLineNumber, stationNameWithXOrY));
        }

        String stationId = metroLines.get(metroLineName).getStation(stationNameTokens[0].strip(), textLineNumber).getAmplUniqueId();
        String xOrY = stationNameTokens[1].strip();

        return switch (xOrY) {
            case "x" -> String.format("SOLVED_X_COORDS[\"%s\"]", stationId);
            case "y" -> String.format("SOLVED_Y_COORDS[\"%s\"]", stationId);
            default -> throw new IllegalArgumentException(String.format("(line %d) Unrecognized station part \"%s\".",
                    textLineNumber, xOrY));
        };
    }

    /**
     * Process an 'equal' constraint. This is a type of constraint where two sums of X/Y coordinates are required to be equal.
     * @param inputText The input text which declares the constraint, with "equal" removed.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     */
    private void processEqualConstraint(String inputText, Map<String, MetroLine> metroLines, int textLineNumber) throws IOException {
        Pair<String, String> lhsResult = Util.consumeDoubleQuoted(inputText, textLineNumber);
        Pair<String, String> rhsResult = Util.consumeDoubleQuoted(lhsResult.getRight(), textLineNumber);

        String lhs = lhsResult.getLeft();
        String rhs = rhsResult.getLeft();
        String[] lhsSummands = lhs.split("\\+"); // splits on the symbol +
        String[] rhsSummands = rhs.split("\\+");

        lhsSummands = Arrays.stream(lhsSummands).map(String::strip).map(s -> processSummand(s, metroLines, textLineNumber)).toArray(String[]::new);
        rhsSummands = Arrays.stream(rhsSummands).map(String::strip).map(s -> processSummand(s, metroLines, textLineNumber)).toArray(String[]::new);

        amplModFile.write(String.format("subject to equal_%d: %s = %s;", textLineNumber,
                String.join(" + ", lhsSummands), String.join(" + ", rhsSummands)));
        amplModFile.newLine();
    }

    /**
     * Processes a line of text which represents an alignment constraint between some number of stations.
     * @param textLine The line of input that declares the constraint.
     * @param metroLine The metro line in the network of any stations referred to in the constraint. If null, to be read from each station.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @param textLineNumber Line number of the input which declared this constraint.
     */
    private void processConstraint(String textLine, MetroLine metroLine, Map<String, MetroLine> metroLines,
                                   int textLineNumber) throws IOException {
        String constraintType = textLine.split("\\s+")[0];
        String textLineRest = Util.removePrefix(textLine, constraintType);
        textLineRest = textLineRest.strip();

        switch (constraintType) {
            case "vertical", "horizontal", "up-right", "down-right" ->
                    processCardinalDirectionConstraint(textLineRest, constraintType, metroLine, metroLines, textLineNumber);
            case "same-station" -> processSameStationConstraint(textLineRest, metroLines, textLineNumber);
            case "equal" -> processEqualConstraint(textLineRest, metroLines, textLineNumber);
            default -> throw new IllegalArgumentException(String.format("Constraint (line %d) is invalid. Earlier code should have already validated this.", textLineNumber));
        }
    }

    /**
     * Processes all alignment constraints.
     * @param constraints The constraints.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    private void processConstraints(List<Constraint> constraints, Map<String, MetroLine> metroLines) throws IOException {
        for (Constraint constraint : constraints) {
            processConstraint(constraint.constraintText(), constraint.metroLine(), metroLines, constraint.textLineNumber());
        }
    }

    /**
     * Writes the AMPL .dat file.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    private void writeData(Map<String, MetroLine> metroLines) throws IOException {
        amplDatFile.write(String.format("param SCALE_FACTOR := %d;", scaleFactor));
        amplDatFile.newLine();
        amplDatFile.write(String.format("param LINE_WIDTH := %d;", metroLineWidth));
        amplDatFile.newLine();
        amplDatFile.newLine();

        Stream<Station> stations = metroLines.values().stream().flatMap(metroLine -> metroLine.getStations().values().stream());
        ArrayList<String> xCoordTokens = new ArrayList<>();
        ArrayList<String> yCoordTokens = new ArrayList<>();
        stations.forEach(station -> {
            xCoordTokens.add(station.getAmplUniqueId());
            xCoordTokens.add(Integer.toString(station.getOriginalX()));

            yCoordTokens.add(station.getAmplUniqueId());
            yCoordTokens.add(Integer.toString(station.getOriginalY()));
        });

        amplDatFile.write("param ORIGINAL_X_COORDS := ");
        amplDatFile.write(String.join(" ", xCoordTokens));
        amplDatFile.write(";");
        amplDatFile.newLine();
        amplDatFile.newLine();

        amplDatFile.write("param ORIGINAL_Y_COORDS := ");
        amplDatFile.write(String.join(" ", yCoordTokens));
        amplDatFile.write(";");
        amplDatFile.newLine();
        amplDatFile.newLine();
    }

    /**
     * Writes the AMPL .mod and .dat files based on the constraints and parameters of the network.
     * @param amplModPath Path to write the AMPL .mod file to.
     * @param amplDatPath Path to write the AMPL .dat file to.
     * @param constraints The constraints.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    public void writeAmplFiles(String amplModPath, String amplDatPath, List<Constraint> constraints, Map<String, MetroLine> metroLines) throws IOException {
        System.out.println("Writing AMPL files.");
        try (BufferedWriter modFile = new BufferedWriter(new FileWriter(amplModPath));
             BufferedWriter datFile = new BufferedWriter(new FileWriter(amplDatPath))) {
            amplModFile = modFile;
            amplDatFile = datFile;

            writeInitialModel(metroLines);
            processConstraints(constraints, metroLines);
            writeData(metroLines);
        }
    }

    /**
     * Solves the AMPL model and stores the solved coordinates for each station.
     * @param amplModPath Path to the AMPL .mod path.
     * @param amplDatPath Path to the AMPL .dat path.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    public void solveAmpl(String amplModPath, String amplDatPath, Map<String, MetroLine> metroLines) throws IOException {
        System.out.println("Solving AMPL model.");
        try (AMPL ampl = new AMPL()) {
            ampl.read(amplModPath);
            ampl.readData(amplDatPath);
            ampl.setOption("solver", "scip"); // scip seems to work well - cbc is very slow

            ampl.solve();

            for (MetroLine metroLine : metroLines.values()) {
                for (Station station : metroLine.getStations().values()) {
                    station.setSolvedX((int)(double)ampl.getValue(String.format("SOLVED_X_COORDS[\"%s\"]", station.getAmplUniqueId())));
                    station.setSolvedY((int)(double)ampl.getValue(String.format("SOLVED_Y_COORDS[\"%s\"]", station.getAmplUniqueId())));
                }
            }
        }
    }
}
