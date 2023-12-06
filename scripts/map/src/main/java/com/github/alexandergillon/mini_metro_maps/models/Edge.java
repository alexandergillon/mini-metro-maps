package com.github.alexandergillon.mini_metro_maps.models;

import java.util.Objects;

/** Represents an edge between two stations on a metro line. */
public record Edge(Station from, Station to) {
    /**
     * @param station A station.
     * @return Whether this edge contains that station.
     */
    public boolean containsStation(Station station) {
        return from.equals(station) || to.equals(station);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Edge edge = (Edge) o;
        return Objects.equals(from, edge.from) && Objects.equals(to, edge.to);
    }

    @Override
    public int hashCode() {
        return Objects.hash(from, to);
    }
}