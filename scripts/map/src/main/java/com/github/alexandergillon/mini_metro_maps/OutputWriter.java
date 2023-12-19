package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.bezier.Point;
import com.github.alexandergillon.mini_metro_maps.models.core.Curve;
import com.github.alexandergillon.mini_metro_maps.models.core.Edge;
import com.github.alexandergillon.mini_metro_maps.models.core.Endpoint;
import com.github.alexandergillon.mini_metro_maps.models.core.MetroLine;
import com.github.alexandergillon.mini_metro_maps.models.core.Station;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputEdge;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputLineSegment;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputMetroLine;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputNetwork;
import com.github.alexandergillon.mini_metro_maps.models.output.OutputStation;
import com.github.alexandergillon.mini_metro_maps.models.parsing.ColorEntry;
import org.apache.commons.lang3.tuple.Pair;

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

    /** Map from metro line name -> MetroLine object for the metro lines in the network. */
    private final Map<String, MetroLine> metroLines;

    /** Set of all parallel curves. */
    private final HashSet<Curve> parallelCurves = new HashSet<>();

    /** Set of all special curves. */
    private final HashSet<Curve> specialCurves = new HashSet<>();

    /** Map from Curve to OutputEdge for each curve that has already been processed. Needed for parallel and special curves. */
    private final HashMap<Curve, OutputEdge> curveToOutputEdge = new HashMap<>();

    /** Jackson ObjectMapper for JSON parsing. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Constructor. Builds the metro line name --> hex color string mapping.
     * @param outputPath Path to write the output JSON file.
     * @param bezierPath Path to bezier.json, for model Bezier curves.
     * @param colorsPath Path to colors.json, for colors of metro lines.
     * @param rCsvInPath Path to store a temporary .csv file, to communicate with R.
     * @param rCsvOutPath Path that R writes its response to.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    public OutputWriter(String outputPath, String bezierPath, String colorsPath, String rCsvInPath, String rCsvOutPath,
                        Map<String, MetroLine> metroLines) throws IOException {
        this.outputPath = outputPath;
        bezierGenerator = new BezierGenerator(bezierPath, rCsvInPath, rCsvOutPath);
        buildNameToColor(colorsPath);
        this.metroLines = metroLines;
    }

    /** Writes the output JSON file. */
    public void writeJson() throws IOException, InterruptedException {
        HashMap<String, OutputMetroLine> outputMetroLines = new HashMap<>();

        for (MetroLine metroLine : metroLines.values()) {
            outputMetroLines.put(metroLine.getName(), toOutputMetroLine(metroLine));
        }

        resolveParallelCurves(outputMetroLines);
        processSpecialCurves(outputMetroLines);

        Pair<Integer, Integer> maxXAndY = getMaxXAndY(metroLines);
        int maxX = maxXAndY.getLeft();
        int maxY = maxXAndY.getRight();


        OutputNetwork outputNetwork = new OutputNetwork(GenerateMap.METRO_LINE_WIDTH, maxX, maxY,
                outputMetroLines.values().stream().toList());

        System.out.println("Writing output file.");
        Files.createDirectories(Path.of(outputPath).getParent());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(outputPath), outputNetwork);
    }

    /**
     * Finds the maximum X and Y values across all stations, plus a border.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     * @return The maximum X and Y values across all stations, as a pair (x,y).
     */
    private Pair<Integer, Integer> getMaxXAndY(Map<String, MetroLine> metroLines) {
        int maxX = Integer.MIN_VALUE;
        int maxY = Integer.MIN_VALUE;

        for (MetroLine metroLine : metroLines.values()) {
            for (Station station : metroLine.getStations().values()) {
                maxX = Integer.max(maxX, station.getSolvedX());
                maxY = Integer.max(maxY, station.getSolvedY());
            }
        }

        return Pair.of(maxX, maxY);
    }

    /**
     * Converts a MetroLine to an OutputMetroLine. Involves turning edges/curves into their respective line segments.
     * @param metroLine MetroLine to convert.
     * @return That MetroLine, as an OutputMetroLine.
     */
    private OutputMetroLine toOutputMetroLine(MetroLine metroLine) {
        String name = metroLine.getName();
        String color = nameToColor.get(name);
        int zIndex = metroLine.getZIndex();

        List<OutputStation> stations = metroLine.getStations().values().stream()
                .filter(station -> !station.isAlignmentPoint()) // Exclude alignment points from final output (comment out for debugging)
                .map(
                    station -> new OutputStation(station.getAmplId(), station.getName(),
                                                 station.getSolvedX(), station.getSolvedY())
                )
                .toList();

        List<OutputEdge> edges = buildOutputEdges(metroLine);
        List<OutputLineSegment> endpointSegments = metroLine.getEndpoints().stream().map(Endpoint::toLineSegment).toList();

        return new OutputMetroLine(name, color, zIndex, stations, edges, endpointSegments);
    }

    /** Builds the output edges of a metro line. */
    private List<OutputEdge> buildOutputEdges(MetroLine metroLine) {
        HashSet<Edge> seenEdges = new HashSet<>(); // to avoid duplicating edges that have curve info
        ArrayList<OutputEdge> outputEdges = new ArrayList<>();

        // For curves, delegate line segments to bezierGenerator.
        for (Curve curve : metroLine.getCurves()) {
            if (curve.getParallelTo() != null) {
                // Parallel curves will be processed later, as they may depend on curves that haven't been generated yet.
                parallelCurves.add(curve);
            } else if (curve.getType().equals("special")) {
                // Same for special curves, as they may depend on parallel curves, which may depend on unprocessed curves.
                specialCurves.add(curve);
            } else {
                OutputEdge outputEdge = new OutputEdge(curve.getFrom().getAmplId(), curve.getTo().getAmplId(),
                        bezierGenerator.toLineSegmentsNonSpecial(curve));
                curveToOutputEdge.put(curve, outputEdge);

                if (!curve.getFrom().isAlignmentPoint() && !curve.getTo().isAlignmentPoint()) {
                    // Curves with an alignment point as either endpoint are not meant to be written to the output.
                    // However, we still needed to generate them to they can go into curveToOutputEdge, which allows
                    // curves that depend on them to be processed correctly.
                    outputEdges.add(outputEdge);
                }
            }

            seenEdges.add(new Edge(curve.getFrom(), curve.getTo()));
        }

        // Other edges must be straight lines - give them a straight line segment.
        for (Edge edge : metroLine.getEdges()) {
            if (!seenEdges.contains(edge)) {
                Station station1 = edge.from();
                Station station2 = edge.to();

                validateStraightEdge(station1, station2);

                OutputLineSegment straightLineSegment = OutputLineSegment.fromStraightLine(station1.toPoint(), station2.toPoint());
                outputEdges.add(new OutputEdge(station1.getAmplId(), station2.getAmplId(), List.of(straightLineSegment)));
            }
        }

        return outputEdges;
    }

    /**
     * Resolves all parallel curves. Uses curve information from the curves that they are parallel to to
     * generate line segments for all parallel curves.
     * @param outputMetroLines Mapping from metro line name --> OutputMetroLine for all lines in the network. Note
     *                         this is not the usual metro line name --> MetroLine map.
     */
    private void resolveParallelCurves(HashMap<String, OutputMetroLine> outputMetroLines) throws IOException, InterruptedException {
        while (!parallelCurves.isEmpty()) {
            ArrayList<Curve> processed = new ArrayList<>();

            for (Curve parallelCurve : parallelCurves) {
                if (curveToOutputEdge.containsKey(parallelCurve.getParallelTo())) {
                    OutputEdge parallelTo = curveToOutputEdge.get(parallelCurve.getParallelTo());
                    OutputEdge parallelEdge = new OutputEdge(
                            parallelCurve.getFrom().getAmplId(), parallelCurve.getTo().getAmplId(),
                            bezierGenerator.makeParallelEdge(parallelCurve, parallelTo));

                    curveToOutputEdge.put(parallelCurve, parallelEdge);
                    processed.add(parallelCurve);

                    if (!parallelCurve.getFrom().isAlignmentPoint() && !parallelCurve.getTo().isAlignmentPoint()) {
                        // Curves with an alignment point as either endpoint are not meant to be written to the output.
                        // However, we still needed to generate them to they can go into curveToOutputEdge, which allows
                        // curves that depend on them to be processed correctly.
                        outputMetroLines.get(parallelCurve.getFrom().getMetroLineName()).getEdges().add(parallelEdge);
                    }
                }
            }

            if (processed.isEmpty()) {
                throw new IllegalStateException("No parallel curves could be processed, but there are still parallel curves remaining. There is likely a cyclic dependency.");
            }

            processed.forEach(parallelCurves::remove);
        }
    }

    /**
     * Processes all special curves.
     * @param outputMetroLines Mapping from metro line name --> OutputMetroLine for all lines in the network. Note
     *                         this is not the usual metro line name --> MetroLine map.
     */
    private void processSpecialCurves(HashMap<String, OutputMetroLine> outputMetroLines) {
        for (Curve curve : specialCurves) {
            assert !curve.getFrom().isAlignmentPoint() && !curve.getTo().isAlignmentPoint() : "Special curves should not go between alignment points.";
            OutputEdge edge = new OutputEdge(curve.getFrom().getAmplId(), curve.getTo().getAmplId(),
                    bezierGenerator.toLineSegmentsSpecial(curve, curveToOutputEdge));
            outputMetroLines.get(curve.getFrom().getMetroLineName()).getEdges().add(edge);
        }
    }

    /** Validates that two stations lie on a cardinal direction/diagonal. */
    private void validateStraightEdge(Station station1, Station station2) {
        // todo: potentially move this to parsing stage
        Point station1Coords = station1.toPoint();
        Point station2Coords = station2.toPoint();
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
