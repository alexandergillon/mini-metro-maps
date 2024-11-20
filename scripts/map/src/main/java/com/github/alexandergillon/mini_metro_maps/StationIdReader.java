package com.github.alexandergillon.mini_metro_maps;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.alexandergillon.mini_metro_maps.models.parsing.StationIdEntry;

import java.io.File;
import java.io.IOException;
import java.util.HashMap;
import java.util.NoSuchElementException;
import java.util.Optional;

/** Class to read in data from the station ID JSON file, and provide a metro line -> station name -> station ID mapping. */
public class StationIdReader {

    /** Underlying mapping from metro line name to station name to station ID. */
    protected final HashMap<String, HashMap<String, String>> lineToNameToId = new HashMap<>();

    /** Jackson ObjectMapper for JSON parsing. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    public StationIdReader(String path) throws IOException {
        buildLineToNameToId(path);
    }

    /**
     * @param metroLineName Name of a metro line.
     * @param stationName Name of a station.
     * @return The station ID for that station on that line.
     * @throws NoSuchElementException If there is no station ID entry for the line/station combination.
     */
    public final String getStationId(String metroLineName, String stationName) throws NoSuchElementException {
        Optional<String> override = overrideMapping(metroLineName, stationName);
        if (override.isPresent()) {
            return override.get();
        } else if (!lineToNameToId.containsKey(metroLineName)) {
            throw new NoSuchElementException(String.format("StationIdReader: unknown line %s.", metroLineName));
        } else if (!lineToNameToId.get(metroLineName).containsKey(stationName)) {
            throw new NoSuchElementException(String.format("StationIdReader: unknown station %s on line %s.", stationName, metroLineName));
        } else {
            return lineToNameToId.get(metroLineName).get(stationName);
        }
    }

    /**
     * Allows for override of the metro line -> station name -> station ID mapping, if needed. This method is intended
     * to be overriden in a subclass.
     * @param metroLineName Name of a metro line.
     * @param stationName Name of a station.
     * @return An Optional containing an overriden ID for that line/station combination, or an empty option if the
     * input combination is not override.
     */
    public Optional<String> overrideMapping(String metroLineName, String stationName) {
        return Optional.empty();
    }

    /**
     * Builds the lineToNameToId mapping from the station ID JSON file.
     * @param path Path to the station ID JSON file.
     */
    private void buildLineToNameToId(String path) throws IOException {
        StationIdEntry[] stationIdEntries = objectMapper.readValue(new File(path), StationIdEntry[].class);
        for (StationIdEntry stationIdEntry : stationIdEntries) {
            lineToNameToId.computeIfAbsent(stationIdEntry.getMetroLine(), unused -> new HashMap<>())
                .put(stationIdEntry.getName(), stationIdEntry.getId());
        }
    }
}
