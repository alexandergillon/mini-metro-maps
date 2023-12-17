package com.github.alexandergillon.mini_metro_maps;

import org.apache.commons.lang3.tuple.Pair;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Class for various utility methods. */
public class Util {

    private Util() {
        throw new IllegalStateException("Utility classes should not be instantiated.");
    }

    /**
     * Removes a prefix from a string, if present. Throws an exception if not present.
     * @param s A string.
     * @param prefix A prefix to remove from that string.
     * @return The string, with the prefix removed.
     * @throws IllegalArgumentException If the string does not start with the prefix.
     */
    public static String removePrefix(String s, String prefix) throws IllegalArgumentException {
        if (!s.startsWith(prefix)) {
            throw new IllegalArgumentException(String.format("String \"%s\" does not start with prefix \"%s\".", s, prefix));
        }
        return s.replaceFirst("^" + prefix, "");
    }

    /**
     * E.g. consumeToken("token    rest of string") -> ("token", "rest of string")
     * @param s A string.
     * @param textLineNumber Line number of the input which that string comes from.
     * @return The first token in that string (delimited by whitespace), and the rest of the string.
     */
    public static Pair<String, String> consumeToken(String s, int textLineNumber) {
        if (s.isEmpty()) {
            throw new IllegalArgumentException(String.format("(line %d) Token expected.", textLineNumber));
        }

        s = s.stripLeading();
        int whitespaceIndex = firstWhitespaceIndex(s);
        if (whitespaceIndex == -1) {
            return Pair.of(s, "");
        }

        String token = s.substring(0, whitespaceIndex).strip();
        String rest = s.substring(whitespaceIndex+1).stripLeading();

        return Pair.of(token, rest);
    }

    /**
     * E.g. consumeDoubleQuoted(" \"Hello world!\" rest of string\") -> ("Hello world!", "rest of string")
     * @param s A string.
     * @param textLineNumber Line number of the input which that string comes from.
     * @return The first double-quoted string within that string (without the quotes), and the rest of the string.
     */
    public static Pair<String, String> consumeDoubleQuoted(String s, int textLineNumber) {
        s = s.stripLeading();
        int firstQuoteIndex = s.indexOf('"');
        int secondQuoteIndex = s.indexOf('"', firstQuoteIndex+1);

        if (firstQuoteIndex == -1 || secondQuoteIndex == -1) {
            throw new IllegalArgumentException(String.format("(line %d) Double-quoted string expected.", textLineNumber));
        }

        return Pair.of(s.substring(firstQuoteIndex+1, secondQuoteIndex), s.substring(secondQuoteIndex+1));
    }

    /**
     * @param s A string.
     * @param prefixes An array of prefixes.
     * @return True if `s` starts with any prefix in `prefixes`.
     */
    public static boolean startsWithAny(String s, String[] prefixes) {
        for (String prefix : prefixes) {
            if (s.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Gets all consecutive station pairs in a string of comma-delimited stations.
     * E.g. allConsecutiveStationPairs("station1, station2, station3, station4") -> [(station1, station2), (station2, station3), (station3, station4)]
     * This is inefficient as it (essentially) doubles each string. However efficiency is not the objective of this program.
     * @param stationsString A string of comma-delimited stations.
     * @param textLineNumber Line number of the input which that string comes from.
     * @return All consecutive pairs of stations in that string.
     */
    public static List<Pair<String, String>> allConsecutiveStationPairs(String stationsString, int textLineNumber) {
        stationsString = stationsString.strip();

        String[] stations = Arrays.stream(stationsString.split(",")).map(String::strip).toArray(String[]::new);
        if (stations.length < 2) {
            throw new IllegalArgumentException(String.format("(line %d) Line has fewer than two stations when >= 2 were expected.", textLineNumber));
        }

        ArrayList<Pair<String, String>> pairs = new ArrayList<>();

        String currentStation = stations[0];
        String nextStation;
        int index = 1;
        while (index < stations.length) {
            nextStation = stations[index];
            pairs.add(Pair.of(currentStation, nextStation));
            currentStation = nextStation;
            index++;
        }

        return pairs;
    }

    /**
     * Finds the index of the first whitespace character in a string.
     * @param s A string.
     * @return The index of the first whitespace character in that string, or -1 if no such character is present.
     */
    private static int firstWhitespaceIndex(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (Character.isWhitespace(s.charAt(i))) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Override of HashMap which throws on .get() with no value present.
     */
    public static class ThrowingMap<K, V> extends HashMap<K, V> {
        public ThrowingMap(int initialCapacity, float loadFactor) {
            super(initialCapacity, loadFactor);
        }

        public ThrowingMap(int initialCapacity) {
            super(initialCapacity);
        }

        public ThrowingMap() {
            super();
        }

        public ThrowingMap(Map<? extends K, ? extends V> m) {
            super(m);
        }

        @Override
        public V get(Object key) {
            if (!super.containsKey(key)) throw new NoSuchElementException(String.format("Key %s not found in map.", key.toString()));
            return super.get(key);
        }
    }
}
