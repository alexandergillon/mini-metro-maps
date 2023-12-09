package com.github.alexandergillon.mini_metro_maps;

import java.io.IOException;
import java.nio.file.Path;

public class GenerateMap {

    /** Scale factor for the map. If adjusted, line width should be adjusted too. */
    private static final int SCALE_FACTOR = 5;

    /** Line width of a metro line on the map, in pixels. */
    private static final int METRO_LINE_WIDTH = 10 * SCALE_FACTOR;

    /**
     * args[0] = input file path
     * args[1] = naptan.json path
     * args[2] = AMPL directory path
     * args[3] = output path
     */
    public static void main(String[] args) throws IOException {
        String inputPath = args[0];
        String naptanPath = args[1];
        Path amplDir = Path.of(args[2]);
        String outputPath = args[3];

        String amplInitialModelPath = amplDir.resolve("initial_model.mod").toString();
        String amplModPath = amplDir.resolve("temp").resolve("model.mod").toString();
        String amplDatPath = amplDir.resolve("temp").resolve("data.dat").toString();

        Parser parser = new Parser(inputPath, naptanPath);
        var data = parser.parseData();
        var metroLines = data.getLeft();

        AmplDriver amplDriver = new AmplDriver(amplInitialModelPath, SCALE_FACTOR, METRO_LINE_WIDTH);
        amplDriver.writeAmplFiles(amplModPath, amplDatPath, data.getRight(), metroLines);
        amplDriver.solveAmpl(amplModPath, amplDatPath, outputPath, metroLines);
        System.out.println("Done!");
    }
}