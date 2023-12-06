package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.Constraint;
import com.github.alexandergillon.mini_metro_maps.models.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.Station;
import com.github.alexandergillon.mini_metro_maps.models.Util;
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

/** Class to interact with AMPL. */
public class AmplDriver {

    /** Path to the initial AMPL model file. */
    private final String initialModelPath;

    /** AMPL model file. */
    private BufferedWriter amplModFile;

    /** AMPL data file. */
    private BufferedWriter amplDatFile;

    /**
     * @param initialModelPath Path to the initial AMPL model file.
     */
    public AmplDriver(String initialModelPath) {
        this.initialModelPath = initialModelPath;
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
        amplModFile.write(String.format("subject to vertical_%s_%s: SOLVED_X_COORDS[%s] = SOLVED_X_COORDS[%s];",
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
        amplModFile.write(String.format("subject to horizontal_%s_%s: SOLVED_Y_COORDS[%s] = SOLVED_Y_COORDS[%s];",
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
        amplModFile.write(String.format("subject to rising_diagonal_%s_%s: SOLVED_X_COORDS[%s] - SOLVED_X_COORDS[%s] " +
                "= -(SOLVED_Y_COORDS[%s] - SOLVED_Y_COORDS[%s]);", station1Id, station2Id,
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
        amplModFile.write(String.format("subject to falling_diagonal_%s_%s: SOLVED_X_COORDS[%s] - SOLVED_X_COORDS[%s] " +
                "= SOLVED_Y_COORDS[%s] - SOLVED_Y_COORDS[%s];", station1Id, station2Id,
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
    private Pair<String, String> extractMetroLine(String stationNameWithMetroLine, int textLineNumber) {
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
        // TODO: this code is duplicate of some other code somewhere - pull out into Util
        Pair<String, String> doubleQuotedResult = Util.consumeDoubleQuoted(inputText, textLineNumber);
        String stationsString = doubleQuotedResult.getLeft();
        stationsString = stationsString.strip();

        List<Pair<String, String>> stationPairs = Util.allConsecutiveStationPairs(stationsString, textLineNumber);
        for (Pair<String, String> stationPair : stationPairs) {
            writeCardinalDirectionConstraint(stationPair.getLeft(), stationPair.getRight(), constraintType, metroLine, metroLines, textLineNumber);
        }
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
            case "same-station" -> { } // TODO
            case "equal" -> { } // TODO
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
     * Writes the AMPL .mod and .dat files based on the constraints and parameters of the network.
     * @param amplModPath Path to write the AMPL .mod file to.
     * @param amplDatPath Path to write the AMPL .dat file to.
     * @param constraints The constraints.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    public void writeAmplFiles(String amplModPath, String amplDatPath, List<Constraint> constraints, Map<String, MetroLine> metroLines) throws IOException {
        try (BufferedWriter modFile = new BufferedWriter(new FileWriter(amplModPath));
             BufferedWriter datFile = new BufferedWriter(new FileWriter(amplDatPath))) {
            amplModFile = modFile;
            amplDatFile = datFile;

            writeInitialModel(metroLines);
            processConstraints(constraints, metroLines);
        }
    }
}
