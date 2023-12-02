def consume_double_quoted(s: str) -> tuple[str, str]:
    """
    E.g. consume_double_quoted(' "Hello world!" rest of string') -> ('Hello world!', 'rest of string')
    :param s: A string
    :return: The first double-quoted string in that block (without the quotes), and the rest of the string.
    Raises ValueException if the string does not contain a double-quoted string.
    """
    first_quote_index = s.index('"')
    second_quote_index = s.index('"', first_quote_index + 1)

    return s[first_quote_index + 1:second_quote_index], s[second_quote_index + 1:]
