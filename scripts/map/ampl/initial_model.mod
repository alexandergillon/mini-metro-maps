set STATIONS = {%};

param LINE_WIDTH;
# scale factor?

param ORIGINAL_X_COORDS {STATIONS};
param ORIGINAL_Y_COORDS {STATIONS};

var SOLVED_X_COORDS {STATIONS} integer;
var SOLVED_Y_COORDS {STATIONS} integer;

minimize StationDisplacement: 
    sum {station in STATIONS} 
        (ORIGINAL_X_COORDS[station] - SOLVED_X_COORDS[station]) ^ 2
        + (ORIGINAL_Y_COORDS[station] - SOLVED_Y_COORDS[station]) ^ 2
;