# usage: python move_points.py dx dy ["station1", "station2", ...]
# Moves all stations that exactly match any of the names by dx and dy.
# Be careful with this: its best to diff the output with the original to make sure that everything went ok.
import sys

dx = int(sys.argv[1])
dy = int(sys.argv[2])
stations = tuple([arg.strip().replace('"', "") for arg in sys.argv[3:]])

with open("input/tube_data.txt", "r") as input_file, open("input/tube_data_transformed.txt", "w") as output_file:
    for original_line in input_file.readlines():
        line = original_line.strip()

        if line.startswith("station"):
            line = line.removeprefix("station").strip()
            line = line.removeprefix('"')
            if line.startswith(stations):
                i = line.index('"')
                station = line[0:i]
                line = line.removeprefix(station).removeprefix('"').strip()

                i = line.index(" ")
                x = line[0:i]
                line = line.removeprefix(x).strip()
                x = int(x)

                try:
                    i = line.index(" ")
                except:
                    i = len(line)
                y = line[0:i]
                line = line.removeprefix(y).strip()
                y = int(y)

                output_file.write(f"  station \"{station}\" {x + dx} {y + dy} {line}\n")
            else:
                output_file.write(original_line)
        else:
            output_file.write(original_line)
