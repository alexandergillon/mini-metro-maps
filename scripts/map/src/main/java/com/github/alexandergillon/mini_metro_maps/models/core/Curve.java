package com.github.alexandergillon.mini_metro_maps.models.core;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.Objects;

/** Represents a curve between two stations. */
@Getter
@AllArgsConstructor
public class Curve {

    /** Station that this curve goes from. */
    private Station from;

    /** Station that this curve goes to. */
    private Station to;

    /** Type of this curve. */
    private String type;

    /**
     * Curve that this curve depends on, if any (null otherwise). Null as data is initially read in - is set after
     * all curves have been read in and dependencies can be resolved.
     *
     * Note: no checking is done for cyclic dependencies. Be careful.
     */
    @Setter
    private Curve dependentOn;

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

    @Override
    public String toString() {
        return String.format("%s ---> %s (%s)", from, to, type);
    }
}