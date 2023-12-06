package com.github.alexandergillon.mini_metro_maps.models;

import org.apache.commons.lang3.tuple.Pair;

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
     * E.g. consume_double_quoted(" \"Hello world!\" rest of string\") -> ("Hello world!", "rest of string")
     * @param s A string.
     * @param textLineNumber Line number of the input which that string comes from.
     * @return The first double-quoted string within that string (without the quotes), and the rest of the string.
     */
    public static Pair<String, String> consumeDoubleQuoted(String s, int textLineNumber) {
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
}
