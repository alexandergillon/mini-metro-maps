package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.parsing.NaptanEntry;

import java.io.File;
import java.util.HashMap;
import java.util.NoSuchElementException;

/**
 * Class to read in data from naptan.json and provide a station -> NAPTAN ID mapping.
 * naptan.json is as produced by tfl-api get_stops.py script.
 */
public class NaptanReader {

    /** Underlying mapping from station name to NAPTAN ID. */
    private final HashMap<String, String> nameToNaptan = new HashMap<>();

    /** Jackson ObjectMapper for JSON parsing. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NaptanReader(String path) {
        buildNameToNaptan(path);
    }

    /**
     * @param stationName Name of a station.
     * @return The NAPTAN ID for that station. Note: Euston and Edgware road have suffixes attached to distinguish the
     * two points on the map which correspond to the same station.
     * @throws NoSuchElementException If there is no NAPTAN entry for the station name.
     */
    public String getNaptan(String stationName) throws NoSuchElementException {
        switch (stationName) {
            case "Euston (Charing Cross branch)": return nameToNaptan.get("Euston") + "_CC";
            case "Euston (Bank branch)": return nameToNaptan.get("Euston") + "_B";
            case "Edgware Road (Circle Line) w/ H&C": return nameToNaptan.get("Edgware Road (Circle Line)") + "_HC";
            case "Edgware Road (Circle Line) w/ District": return nameToNaptan.get("Edgware Road (Circle Line)") + "_D";
            default:
                if (!nameToNaptan.containsKey(stationName)) {
                    throw new NoSuchElementException(String.format("No NAPTAN entry for %s.", stationName));
                } else {
                    return nameToNaptan.get(stationName);
                }
        }
    }

    /**
     * Builds the nameToNaptan mapping from the naptan.json file.
     * @param path Path to the naptan.json file.
     */
    private void buildNameToNaptan(String path) {
        try {
            NaptanEntry[] naptanEntries = objectMapper.readValue(new File(path), NaptanEntry[].class);
            for (NaptanEntry naptanEntry : naptanEntries) {
                nameToNaptan.put(naptanEntry.getName(), naptanEntry.getNaptanId());
            }
        } catch (Exception e) {
            // We want to fail immediately - failure is unrecoverable.
            throw new RuntimeException(e);
        }
    }
}
