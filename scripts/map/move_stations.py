# usage: python move_points.py dx dy ["station1", "station2", ...]
# Moves all stations that exactly match any of the names by dx and dy.
# Be careful with this: its best to diff the output with the original to make sure that everything went ok.
import sys

dx = int(sys.argv[1])
dy = int(sys.argv[2])
stations = [arg.strip().replace('"', "") for arg in sys.argv[3:]]
stations_with_trailing_quote = tuple([station + '"' for station in stations])
seen_stations = set()

with open("input/tube_data.txt", "r") as input_file, open("input/tube_data_transformed.txt", "w") as output_file:
    for original_line in input_file.readlines():
        line = original_line.strip()

        if line.startswith(("station", "alignment-point")):
            is_station = line.startswith("station")
            line = line.removeprefix("station" if is_station else "alignment-point").strip()
            line = line.removeprefix('"')
            # Make sure we don't match any station that has this name as a prefix. E.g. don't match "West Hampstead" for "West Ham"
            if line.startswith(stations_with_trailing_quote):
                i = line.index('"')
                station = line[0:i]
                seen_stations.add(station)
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

                output_file.write(f"  {'station' if is_station else 'alignment-point'} \"{station}\" {x + dx} {y + dy} {line}\n")
            else:
                output_file.write(original_line)
        else:
            output_file.write(original_line)

for station in stations:
    if station not in seen_stations:
        print(f"No station {seen_stations}. Output is likely incorrect.")
