import json
import matplotlib.pyplot as plt
from collections import defaultdict

MARKER_SIZE = 5

def plot_line(line):
    name = line["name"]
    color = line["color"]
    stations = line["stations"]
    edges = line["edges"]

    x_coords = []
    y_coords = []
    for station in stations:
        x_coords.append(station["x"])
        y_coords.append(station["y"])

    plt.plot(x_coords, y_coords, marker="o", linestyle="", color=color, markersize=MARKER_SIZE)

    control_point_x_coords = []
    control_point_y_coords = []
    for edge in edges:
        for line_segment in edge["lineSegments"]:
            if not line_segment["straightLine"]:
                control_point_x_coords.append(line_segment["p0"]["x"])
                control_point_x_coords.append(line_segment["p1"]["x"])
                control_point_x_coords.append(line_segment["p2"]["x"])
                control_point_x_coords.append(line_segment["p3"]["x"])

                control_point_y_coords.append(line_segment["p0"]["y"])
                control_point_y_coords.append(line_segment["p1"]["y"])
                control_point_y_coords.append(line_segment["p2"]["y"])
                control_point_y_coords.append(line_segment["p3"]["y"])

    plt.plot(control_point_x_coords, control_point_y_coords, marker="x", linestyle="", color=color, markersize=0.75 * MARKER_SIZE)




def plot_data():
    json_file = open("output/chicago.json", "r")
    lines = json.load(json_file)["metroLines"]
    json_file.close()

    for line in lines:
        plot_line(line)

    plt.gca().invert_yaxis()
    plt.gca().set_aspect('equal')
    plt.show()


if __name__ == "__main__":
    plot_data()
