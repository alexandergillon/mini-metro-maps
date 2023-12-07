package com.github.alexandergillon.mini_metro_maps;

import java.io.IOException;

public class GenerateMap {

    /** Line width of a metro line on the map, in pixels. */
    private static final int metroLineWidth = 10;

    /**
     * args[0] = input file path
     * args[1] = naptan.json path
     * args[2] = initial AMPL model path
     * args[3] = output AMPL .mod path
     * args[4] = output AMPL .dat path
     */
    public static void main(String[] args) throws IOException {
        Parser parser = new Parser(args[0], args[1]);
        var data = parser.parseData();
        AmplDriver amplDriver = new AmplDriver(args[2], metroLineWidth);
        amplDriver.writeAmplFiles(args[3], args[4], data.getRight(), data.getLeft());
        System.out.println("Debugging.");
    }
}