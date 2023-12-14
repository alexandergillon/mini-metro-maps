package com.github.alexandergillon.mini_metro_maps.models.core;

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

    /** Edges compare as equal regardless of ordering of stations. */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Edge edge = (Edge) o;
        return (Objects.equals(from, edge.from) && Objects.equals(to, edge.to))
                || (Objects.equals(from, edge.to) && Objects.equals(to, edge.from));
    }

    /** Hash function is symmetric in `from` and `to`, to align with equals(). */
    @Override
    public int hashCode() {
        if (from.getName().compareTo(to.getName()) < 0) {
            return Objects.hash(from, to);
        } else {
            return Objects.hash(to, from);
        }
    }
}