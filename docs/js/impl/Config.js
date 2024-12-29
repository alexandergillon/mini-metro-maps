/** @file Configuration file. */
/** Wrapped in a class, to avoid globals. */
export class Config {
}
/** Time between updates of train data, in seconds. */
Config.FETCH_TRAIN_DATA_INTERVAL = 15;
/** The minimum time that a train will dwell at a station, in seconds. */
Config.MINIMUM_DWELL_TIME = 20; // seconds
/** The minimum time that a train will dwell at a station, in seconds. */
Config.MAXIMUM_DWELL_TIME = 30; // seconds
/** A train that has been at a station for this long (in seconds) past its expected departure time, with no next station, will disappear. */
Config.TRAIN_TIMEOUT_TIME = 30; // seconds
