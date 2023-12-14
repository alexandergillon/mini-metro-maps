package com.github.alexandergillon.mini_metro_maps;

import com.github.alexandergillon.mini_metro_maps.models.core.MetroLine;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class GenerateMap {

    /** Scale factor for the map. If adjusted, line width should be adjusted too. */
    public static final int SCALE_FACTOR = 5;

    /** Line width of a metro line on the map, in pixels. */
    public static final int METRO_LINE_WIDTH = 10 * SCALE_FACTOR; // must be even or AMPL constraints with be violated

    /**
     * How long of a prefix you need to take from each metro line's name to ensure that all prefixes are unique.
     * Used to try and compress station AMPL identifiers. A value of -1 means use the entire length of metro line name.
     */
    public static final int METRO_LINE_PREFIX_LENGTH = 2;

    /**
     * Ensures that metroLinePrefixLength is set high enough so that all prefixes of metro line names are unique.
     * @param metroLines Map from metro line name -> MetroLine object for the metro lines in the network.
     */
    private static void checkPrefixLength(Map<String, MetroLine> metroLines) {
        if (METRO_LINE_PREFIX_LENGTH == -1) {
            return;
        }

        Set<String> prefixes = new HashSet<>(metroLines.values().stream()
                .map(line -> line.getName().substring(0, METRO_LINE_PREFIX_LENGTH)).toList());
        if (prefixes.size() != metroLines.values().size()) {
            // Prefixes are not unique.
            throw new IllegalStateException(String.format("Metro line prefixes are not unique with prefix length %d.", METRO_LINE_PREFIX_LENGTH));
        }
    }

    /**
     * args[0] = input file path
     * args[1] = naptan.json path
     * args[2] = AMPL directory path
     * args[3] = bezier.json path
     * args[4] = colors.json path
     * args[5] = output path
     */
    public static void main(String[] args) throws IOException {
        String inputPath = args[0];
        String naptanPath = args[1];
        Path amplDir = Path.of(args[2]);
        String bezierPath = args[3];
        String colorsPath = args[4];
        String outputPath = args[5];

        String amplInitialModelPath = amplDir.resolve("initial_model.mod").toString();
        String amplModPath = amplDir.resolve("temp").resolve("model.mod").toString();
        String amplDatPath = amplDir.resolve("temp").resolve("data.dat").toString();

        Parser parser = new Parser(inputPath, naptanPath);
        var data = parser.parseData();
        var metroLines = data.getLeft();

        checkPrefixLength(metroLines);

        AmplDriver amplDriver = new AmplDriver(amplInitialModelPath, SCALE_FACTOR, METRO_LINE_WIDTH);
        amplDriver.writeAmplFiles(amplModPath, amplDatPath, data.getRight(), metroLines);
        amplDriver.solveAmpl(amplModPath, amplDatPath, metroLines);

        OutputWriter outputWriter = new OutputWriter(outputPath, bezierPath, colorsPath);
        outputWriter.writeJson(metroLines);

        System.out.println("Done!");

        Runtime.getRuntime().exec("python copy_json.py");
        Runtime.getRuntime().exec("python plot_output.py");
    }
}