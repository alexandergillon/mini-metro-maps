import parser
import ampl


def main():
    lines, constraints = parser.parse_data()
    ampl.write_ampl_files(lines, constraints)


if __name__ == "__main__":
    main()
