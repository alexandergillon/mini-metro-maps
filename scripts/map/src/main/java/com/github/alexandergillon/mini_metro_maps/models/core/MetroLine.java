package com.github.alexandergillon.mini_metro_maps.models.core;

import lombok.Getter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.NoSuchElementException;

/** Represents a metro line. */
@Getter
public class MetroLine {

    /** The name of this metro line. */
    private final String name;

    /** The stations in this metro line, as a station name -> station object mapping. */
    private final HashMap<String, Station> stations = new HashMap<>();

    /** The edges between stations in this metro line. */
    private final HashSet<Edge> edges = new HashSet<>();

    /** The curves between stations in this metro line. */
    private final ArrayList<Curve> curves = new ArrayList<>();

    /** The 'endpoints' of the line (only for visual purposes). */
    private final ArrayList<Endpoint> endpoints = new ArrayList<>();

    public MetroLine(String name) {
        this.name = name;
    }

    /**
     * Adds a station to this metro line.
     * @param station The station to add.
     */
    public void addStation(Station station) {
        stations.put(station.getName(), station);
    }

    /**
     * Gets a station in this metro line by name, raising an exception on failure.
     * @param stationName Name of the station to find.
     * @param textLineNumber Line number of the input which used this station name.
     * @return The station in this metro line, corresponding to that name.
     * @throws NoSuchElementException If this metro line does not have a station with that name.
     */
    public Station getStation(String stationName, int textLineNumber) throws NoSuchElementException {
        if (!stations.containsKey(stationName)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.", textLineNumber, stationName, name));
        }

        return stations.get(stationName);
    }

    /**
     * Connects two stations in this metro line.
     * @param station1Name Name of the first station.
     * @param station2Name Name of the second station.
     * @param textLineNumber Line number of the input which used these station names.
     * @throws NoSuchElementException If this metro line does not contain one of the stations.
     */
    public void addEdge(String station1Name, String station2Name, int textLineNumber) throws NoSuchElementException {
        if (!stations.containsKey(station1Name)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.",
                    textLineNumber, station1Name, name));
        }
        if (!stations.containsKey(station2Name)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.",
                    textLineNumber, station2Name, name));
        }

        edges.add(new Edge(stations.get(station1Name), stations.get(station2Name)));
    }

    /**
     * Specifies the curve type between two stations.
     * @param station1Name Name of the first station.
     * @param station2Name Name of the second station.
     * @param curveType Curve type of the curve.
     * @param textLineNumber Line number of the input which used these station names.
     */
    public void addCurve(String station1Name, String station2Name, String curveType, int textLineNumber) {
        if (!stations.containsKey(station1Name)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.",
                    textLineNumber, station1Name, name));
        }
        if (!stations.containsKey(station2Name)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.",
                    textLineNumber, station2Name, name));
        }

        Station station1 = stations.get(station1Name);
        Station station2 = stations.get(station2Name);

        if (!edges.contains(new Edge(station1, station2))) {
            throw new NoSuchElementException(String.format(
                    "(line %d) Curve between %s and %s specified, but they are not connected in line %s.",
                    textLineNumber, station1Name, station2Name, name));
        }

        curves.add(new Curve(station1, station2, curveType));
    }

    /**
     * Adds an endpoint to this metro line.
     * @param stationName Name of the station that the endpoint is at.
     * @param type Type of the endpoint.
     * @param textLineNumber Line number of the input which declared this endpoint.
     */
    public void addEndpoint(String stationName, String type, int textLineNumber) {
        if (!stations.containsKey(stationName)) {
            throw new NoSuchElementException(String.format("(line %d) Station %s does not exist for line %s.",
                    textLineNumber, stationName, name));
        }

        Station station = stations.get(stationName);
        endpoints.add(new Endpoint(station, type, textLineNumber));
    }

    /**
     * Checks that this line has no orphan stations (a station connected to no others). If it does, raises an exception.
     * @throws RuntimeException If this line has an orphan station.
     */
    public void assertNoOrphanStations() throws RuntimeException {
        for (Station station : stations.values()) {
            if (!containsEdgeWithStation(station)) {
                throw new RuntimeException(String.format("Line %s has orphan station %s.", name, station.getName()));
            }
        }
    }

    /**
     * @param station A station.
     * @return Whether this metro line contains an edge with that station.
     */
    private boolean containsEdgeWithStation(Station station) {
        // Not the most efficient, but it doesn't have to be.
        for (Edge edge : edges) {
            if (edge.containsStation(station)) {
                return true;
            }
        }
        return false;
    }

    @Override
    public String toString() {
        return String.format("%s line with %d stations", name, stations.size());
    }
}
