import json
import matplotlib.pyplot as plt
from collections import defaultdict

colors = {
    "hammersmith-city": "#ec9bad",
    "victoria": "#00a0df",
    "waterloo-city": "#6bcdb1",
    "central": "#e1251b",
    "metropolitan": "#870f53",
    "piccadilly": "#00109f",
    "district": "#007934",
    "bakerloo": "#a65a2a",
    "jubilee": "#7b868c",
    "circle": "#ffcc00",
    "northern": "#000000",
}
data = defaultdict(lambda: {"x": list(), "y": list()})

def load_data():
    json_file = open("output/stations.json", "r")
    stations = json.load(json_file)
    json_file.close()

    for station in stations:
        data[station["metroLine"]]["x"].append(station["x"])
        data[station["metroLine"]]["y"].append(station["y"])


def plot_data():
    for line in data:
        plt.plot(data[line]["x"], data[line]["y"], marker="o", linestyle="", color=colors[line])

    plt.gca().invert_yaxis()
    plt.gca().set_aspect('equal')
    plt.show()


if __name__ == "__main__":
    load_data()
    plot_data()