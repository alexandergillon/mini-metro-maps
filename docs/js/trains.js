/** Function to get train data. Dynamically imported during setup. */
let getData;

/** Sets the getData function. */
function setGetData(getDataIn) {
    getData = getDataIn;
}

/** Callback function to update train data. */
function updateTrains(event) {
    // todo: implement
    getData();
}

export { setGetData, updateTrains };