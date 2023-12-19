set STATIONS = {%};

param SCALE_FACTOR;
param LINE_WIDTH;

param ORIGINAL_X_COORDS {STATIONS};
param ORIGINAL_Y_COORDS {STATIONS};

param ALIGNMENT_POINT_WEIGHT {STATIONS};

var SOLVED_X_COORDS {STATIONS} integer;
var SOLVED_Y_COORDS {STATIONS} integer;

minimize StationDisplacement: 
    sum {station in STATIONS} ALIGNMENT_POINT_WEIGHT[station] * (
        (ORIGINAL_X_COORDS[station] * SCALE_FACTOR - SOLVED_X_COORDS[station]) ^ 2
        + (ORIGINAL_Y_COORDS[station] * SCALE_FACTOR - SOLVED_Y_COORDS[station]) ^ 2
    )
;