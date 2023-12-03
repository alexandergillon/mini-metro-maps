package com.github.alexandergillon.mini_metro_maps.models;

import java.util.Objects;

/** Represents a curve between two stations. */
public record Curve(Station from, Station to, String type) {
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Curve curve = (Curve) o;
        return Objects.equals(from, curve.from) && Objects.equals(to, curve.to) && Objects.equals(type, curve.type);
    }

    @Override
    public int hashCode() {
        return Objects.hash(from, to, type);
    }
}