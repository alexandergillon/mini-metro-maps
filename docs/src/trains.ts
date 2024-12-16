// import { CityModule } from "./cities/city.js";
//
// /** POJO to store information about the next arrival for a train. */
// class ArrivalInfo {
//     readonly trainId: string;
//     readonly line: string;
//     readonly stationId: string;
//     readonly arrivalTime: number;
//
//     /**
//      * @param trainId ID of the train.
//      * @param line Line name of the train.
//      * @param stationId Next station ID of the train.
//      * @param arrivalTime Arrival time of the train, in milliseconds from the epoch.
//      */
//     constructor(trainId: string, line: string, stationId: string, arrivalTime: number) {
//         this.trainId = trainId;
//         this.line = line;
//         this.stationId = stationId;
//         this.arrivalTime = arrivalTime;
//     }
// }
//
// /** Function to get train data. Dynamically imported during setup. */
// let getData: CityModule.GetDataFunction;
//
// /** Sets the getData function. */
// function setGetData(getDataIn: CityModule.GetDataFunction) {
//     getData = getDataIn;
// }
//
// /** Callback function to update train data. */
// async function fetchTrainData() {
//     // todo: implement
//     console.log(await getData());
// }
//
// export { ArrivalInfo, setGetData, fetchTrainData };