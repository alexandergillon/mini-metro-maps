package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.ColorEntry;
import com.github.alexandergillon.mini_metro_maps.models.Curve;
import com.github.alexandergillon.mini_metro_maps.models.Edge;
import com.github.alexandergillon.mini_metro_maps.models.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.Station;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.bezier.StraightLine;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputEdge;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputMetroLine;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputStation;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/** Class to handle writing the output file. */
public class OutputWriter {

    /** Path to the output file. */
    private final String outputPath;

    /** For generating Bezier curves. */
    private final BezierGenerator bezierGenerator;

    /** Mapping from metro line name --> hex color string. */
    private final HashMap<String, String> nameToColor = new HashMap<>();

    /** Jackson ObjectMapper for JSON parsing. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Constructor. Builds the metro line name --> hex color string mapping.
     * @param outputPath Path to write the output JSON file.
     * @param bezierPath Path to bezier.json, for model Bezier curves.
     * @param colorsPath Path to colors.json, for colors of metro lines.
     */
    public OutputWriter(String outputPath, String bezierPath, String colorsPath) throws IOException {
        this.outputPath = outputPath;
        bezierGenerator = new BezierGenerator(bezierPath);
        buildNameToColor(colorsPath);
    }

    /**
     * Writes the output JSON file.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    public void writeJson(Map<String, MetroLine> metroLines) throws IOException {
        ArrayList<OutputMetroLine> outputMetroLines = new ArrayList<>();

        for (MetroLine metroLine : metroLines.values()) {
            outputMetroLines.add(toOutputMetroLine(metroLine));
        }

        System.out.println("Writing output file.");
        Files.createDirectories(Path.of(outputPath).getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(outputPath), outputMetroLines);
    }

    /**
     * Converts a MetroLine to an OutputMetroLine. Involves turning edges/curves into their respective line segments.
     * @param metroLine MetroLine to convert.
     * @return That MetroLine, as an OutputMetroLine.
     */
    private OutputMetroLine toOutputMetroLine(MetroLine metroLine) {
        String name = metroLine.getName();
        String color = nameToColor.get(name);

        List<OutputStation> stations = metroLine.getStations().values().stream()
                .map(
                    station -> new OutputStation(station.getAmplUniqueId(), station.getName(),
                                                 station.getSolvedX(), station.getSolvedY())
                )
                .toList();

        List<OutputEdge> edges = buildOutputEdges(metroLine);

        return new OutputMetroLine(name, color, stations, edges);
    }

    /** Builds the output edges of a metro line. */
    private List<OutputEdge> buildOutputEdges(MetroLine metroLine) {
        HashSet<Edge> seenEdges = new HashSet<>(); // to avoid duplicating edges that have curve info
        ArrayList<OutputEdge> outputEdges = new ArrayList<>();

        for (Curve curve : metroLine.getCurves()) {
            // For curves, delegate line segments to bezierGenerator.
            seenEdges.add(new Edge(curve.from(), curve.to()));
            outputEdges.add(new OutputEdge(curve.from().getName(), curve.to().getName(), bezierGenerator.toLineSegments(curve)));
        }

        for (Edge edge : metroLine.getEdges()) {
            // Other edges must be straight lines - give them a straight line segment.
            if (!seenEdges.contains(edge) && !seenEdges.contains(new Edge(edge.to(), edge.from()))) {
                Station station1 = edge.from();
                Station station2 = edge.to();

                Point station1Position = Point.fromSolvedStationCoordinates(station1);
                Point station2Position = Point.fromSolvedStationCoordinates(station2);

                validateStraightEdge(station1, station2);

                OutputLineSegment straightLineSegment = OutputLineSegment.fromStraightLine(new StraightLine(station1Position, station2Position));
                outputEdges.add(new OutputEdge(station1.getName(), station2.getName(), List.of(straightLineSegment)));
            }
        }

        return outputEdges;
    }

    /** Validates that two stations lie on a cardinal direction/diagonal. */
    private void validateStraightEdge(Station station1, Station station2) {
        // todo: potentially move this to parsing stage
        Point station1Coords = Point.fromSolvedStationCoordinates(station1);
        Point station2Coords = Point.fromSolvedStationCoordinates(station2);
        if (!(
                station1Coords.getX() == station2Coords.getX()
                || station1Coords.getY() == station2Coords.getY()
                || (station1Coords.getX() - station2Coords.getX()) == (station1Coords.getY() - station2Coords.getY())
                || (station1Coords.getX() - station2Coords.getX()) == -(station1Coords.getY() - station2Coords.getY())
        )) {
            throw new IllegalArgumentException(String.format(
                    "Stations %s and %s on line %s are not aligned, but do not have a curve specified.",
                    station1.getName(), station2.getName(), station1.getMetroLineName()));
        }
    }

    /**
     * Builds the metro line name --> hex color string mapping.
     * @param path Path to colors.json.
     */
    private void buildNameToColor(String path) throws IOException {
        ColorEntry[] colorEntries = objectMapper.readValue(new File(path), ColorEntry[].class);
        for (ColorEntry colorEntry : colorEntries) {
            nameToColor.put(colorEntry.getName(), colorEntry.getColor());
        }
    }
}
