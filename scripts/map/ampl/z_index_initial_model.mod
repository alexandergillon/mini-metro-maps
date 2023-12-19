set METRO_LINES = {%};

# SCIP needs an uppper bound on variables for alldiff (filled in by program)
var Z_INDEX {METRO_LINES} integer >= 1, <= %;

# try and get reasonable numbers by minimizing z
minimize ZIndices:
    sum {metro_line in METRO_LINES} (
        Z_INDEX[metro_line]
    )
;

subject to all_z_indices_different: alldiff ({metro_line in METRO_LINES} Z_INDEX[metro_line]);
