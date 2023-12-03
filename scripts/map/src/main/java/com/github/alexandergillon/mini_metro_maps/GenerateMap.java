package com.github.alexandergillon.mini_metro_maps;

import java.io.IOException;

public class GenerateMap {
    public static void main(String[] args) throws IOException {
        Parser parser = new Parser(args[0], args[1]);
        var data = parser.parseData();
        System.out.println("Debugging.");
    }
}