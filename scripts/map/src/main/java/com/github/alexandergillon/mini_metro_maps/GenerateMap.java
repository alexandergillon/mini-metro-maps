package com.github.alexandergillon.mini_metro_maps;

import java.io.IOException;
import java.nio.file.Path;

public class GenerateMap {

    /** Line width of a metro line on the map, in pixels. */
    private static final int metroLineWidth = 10;

    /**
     * args[0] = input file path
     * args[1] = naptan.json path
     * args[2] = AMPL directory path
     * \initial_model.mod ampl\temp\model.mod ampl\temp\data.dat
     */
    public static void main(String[] args) throws IOException {
        String inputPath = args[0];
        String naptanPath = args[1];
        Path amplDir = Path.of(args[2]);

        String amplInitialModelPath = amplDir.resolve("initial_model.mod").toString();
        String amplModPath = amplDir.resolve("temp").resolve("model.mod").toString();
        String amplDatPath = amplDir.resolve("temp").resolve("data.dat").toString();

        Parser parser = new Parser(inputPath, naptanPath);
        var data = parser.parseData();
        AmplDriver amplDriver = new AmplDriver(amplInitialModelPath, metroLineWidth);
        amplDriver.writeAmplFiles(amplModPath, amplDatPath, data.getRight(), data.getLeft());
        System.out.println("Debugging.");
    }
}