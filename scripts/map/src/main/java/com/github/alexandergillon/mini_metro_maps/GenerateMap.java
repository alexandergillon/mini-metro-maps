package com.github.alexandergillon.mini_metro_maps;

import java.io.IOException;
import java.nio.file.Path;

public class GenerateMap {

    /** Scale factor for the map. If adjusted, line width should be adjusted too. */
    public static final int SCALE_FACTOR = 5;

    /** Line width of a metro line on the map, in pixels. */
    public static final int METRO_LINE_WIDTH = 10 * SCALE_FACTOR; // must be even or AMPL constraints will be violated

    /**
     * Weight for alignment points in AMPL (normal stations have weight 1). The idea of this is that we want to weight
     * alignment points less than stations, as they are usually meant to help align things rather than enforce
     * specific positions. However, we need to give them some weight so that AMPL puts them in a sensible place. If
     * the weight is 0, it can just return garbage for alignment points that are not sufficiently constrained.
     *
     * This value is a string as it is written to an AMPL file - never used in Java code.
     */
    public static final String ALIGNMENT_POINT_WEIGHT = "0.1";

    /**
     * args[0] = input file path
     * args[1] = naptan.json path
     * args[2] = AMPL directory path
     * args[3] = bezier.json path
     * args[4] = colors.json path
     * args[5] = output path
     */
    public static void main(String[] args) throws IOException, InterruptedException {
        String inputPath = args[0];
        String naptanPath = args[1];
        Path amplDir = Path.of(args[2]);
        String bezierPath = args[3];
        String colorsPath = args[4];
        Path rDir = Path.of(args[5]);
        String outputPath = args[6];

        String amplInitialModelPath = amplDir.resolve("initial_model.mod").toString();
        String zAmplInitialModelPath = amplDir.resolve("z_index_initial_model.mod").toString();
        String amplModPath = amplDir.resolve("temp").resolve("model.mod").toString();
        String amplDatPath = amplDir.resolve("temp").resolve("data.dat").toString();
        String zAmplModPath = amplDir.resolve("temp").resolve("zModel.mod").toString();

        String rCsvInPath = rDir.resolve("bezier_in.csv").toString();
        String rCsvOutPath = rDir.resolve("bezier_out.csv").toString();

        Parser parser = new Parser(inputPath, naptanPath);
        var data = parser.parseData();
        var metroLines = data.getLeft();
        var alignmentConstraints = data.getMiddle();
        var zIndexConstraints = data.getRight();

        AmplDriver amplDriver = new AmplDriver(amplInitialModelPath, SCALE_FACTOR, METRO_LINE_WIDTH, zAmplInitialModelPath);
        amplDriver.writeAmplFiles(amplModPath, amplDatPath, zAmplModPath, alignmentConstraints, zIndexConstraints, metroLines);
        amplDriver.solveAmpl(amplModPath, amplDatPath, zAmplModPath, metroLines);

        OutputWriter outputWriter = new OutputWriter(outputPath, bezierPath, colorsPath, rCsvInPath, rCsvOutPath, metroLines);
        outputWriter.writeJson();

        System.out.println("Done!");

        Runtime.getRuntime().exec("python copy_json.py");
        Runtime.getRuntime().exec("python plot_output.py");
    }
}