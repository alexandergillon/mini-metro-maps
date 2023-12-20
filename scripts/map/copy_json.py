import json

if __name__ == "__main__":
    with open("output/london.json", "r") as json_file:
        stations = json.load(json_file)

    with open("./../../docs/maps/data/london.json", "w") as output_file:
        json.dump(stations, output_file, separators=(',', ':'), indent=None)
