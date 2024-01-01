package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.parsing.NaptanEntry;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.NoSuchElementException;

/**
 * Class to read in data from naptan.json and provide a metro line -> station -> NAPTAN ID mapping.
 * naptan.json is as produced by tfl-api get_stops.py script.
 */
public class NaptanReader {

    /** Underlying mapping from metro line name to station name to NAPTAN ID. */
    private final HashMap<String, HashMap<String, String>> lineToNameToNaptan = new HashMap<>();

    /** Jackson ObjectMapper for JSON parsing. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NaptanReader(String path) throws IOException {
        buildNameToNaptan(path);
    }

    /**
     * @param metroLineName Name of a metro line.
     * @param stationName Name of a station.
     * @return The NAPTAN ID for that station on that line. Note: Euston and Edgware road have suffixes attached to
     * distinguish the two points on the map which correspond to the same station.
     * @throws NoSuchElementException If there is no NAPTAN entry for the station name.
     */
    public String getNaptan(String metroLineName, String stationName) throws NoSuchElementException {
        switch (stationName) {
            case "Euston (Charing Cross branch)": return lineToNameToNaptan.get("northern").get("Euston") + "_CC";
            case "Euston (Bank branch)": return lineToNameToNaptan.get("northern").get("Euston") + "_B";
            case "Edgware Road (Circle Line) w/ H&C": return lineToNameToNaptan.get("circle").get("Edgware Road (Circle Line)") + "_HC";
            case "Edgware Road (Circle Line) w/ District": return lineToNameToNaptan.get("circle").get("Edgware Road (Circle Line)") + "_D";
            default:
                if (!lineToNameToNaptan.containsKey(metroLineName)
                        || !lineToNameToNaptan.get(metroLineName).containsKey(stationName)) {
                    throw new NoSuchElementException(String.format("No NAPTAN entry for %s on line %s.", stationName, metroLineName));
                } else {
                    return lineToNameToNaptan.get(metroLineName).get(stationName);
                }
        }
    }

    /**
     * Builds the lineToNameToNaptan mapping from the naptan.json file.
     * @param path Path to the naptan.json file.
     */
    private void buildNameToNaptan(String path) throws IOException {
        NaptanEntry[] naptanEntries = objectMapper.readValue(new File(path), NaptanEntry[].class);
        for (NaptanEntry naptanEntry : naptanEntries) {
            lineToNameToNaptan.computeIfAbsent(naptanEntry.getMetroLine(), unused -> new HashMap<>())
                    .put(naptanEntry.getName(), naptanEntry.getNaptanId());
        }
    }
}
