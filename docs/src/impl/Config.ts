/** @file Configuration file. */

/** Wrapped in a class, to avoid globals. */
export class Config {
    /** Whether developer mode is enabled. Enables debugging UI. */
    public static readonly DEV_MODE_ENABLED =  new URLSearchParams(window.location.search).get("devmode");

    /** Time between updates of train data, in seconds. */
    public static readonly FETCH_TRAIN_DATA_INTERVAL = 15;

    /** The minimum time that a train will dwell at a station, in seconds. */
    public static readonly MINIMUM_DWELL_TIME = 20; // seconds

    /** The minimum time that a train will dwell at a station, in seconds. */
    public static readonly MAXIMUM_DWELL_TIME = 30; // seconds

    /** A train that has been at a station for this long (in seconds) past its expected departure time, with no next station, will disappear. */
    public static readonly TRAIN_TIMEOUT_TIME = 30; // seconds
}
