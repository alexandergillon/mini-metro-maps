# R script which takes in a cubic Bezier curve and a distance, and fits a parallel curve to the Bezier curve at that distance.
# Fits curve on the outside of a the input curve. The fitted curve contains a number of cubic Bezier curves.
#
# Input is a 5x2 matrix in bezier_in.csv, where the first row is (distance, -1), and the next 4 rows are the Bezier control
# points (x, y).
#
# Output is a (4n+1) x 2 matrix in bezier_out.csv containing n cubic Bezier curves. The first row is (n, -1), which allows you
# to read what n is programatically. Each set of 4 rows following are control points (x, y) for a Bezier curve.
library(bezier)

# Returns the derivative of a cubic Bezier curve defined by (p0, p1, p2, p3) at input parameter t.
# I.e. the tangent of the curve at t.
cubic_bezier_derivative_at = function(p0, p1, p2, p3, t) {
    return(
        3 * ((1-t) ^ 2) * (p1 - p0)
        + 6 * (1-t) * t * (p2 - p1)
        + 3 * (t ^ 2) * (p3 - p2)
    )
}

# Returns the second derivative of a cubic Bezier curve defined by (p0, p1, p2, p3) at input parameter t.
cubic_bezier_second_derivative_at = function(p0, p1, p2, p3, t) {
    return(
        6 * (1-t) * (p2 - 2 * p1 + p0)
        + 6 * t * (p3 - 2 * p2 + p1)
    )
}
# Returns the curvature of a cubic Bezier curve defined by (p0, p1, p2, p3) at input parameter t.
cubic_bezier_curvature_at = function(p0, p1, p2, p3, t) {
    first_derivative = cubic_bezier_derivative_at(p0, p1, p2, p3, t)
    second_derivative = cubic_bezier_second_derivative_at(p0, p1, p2, p3, t)
    numerator_matrix = matrix(c(first_derivative, second_derivative), nrow=2, ncol=2)

    return(
        (det(numerator_matrix)) / ((norm(first_derivative, type="2")) ^ 3)
    )
}

# Normalizes a vector.
normalize = function(vector) {
    return(vector / sqrt(sum(vector^2)))
}

# Samples n points from a cubic Bezier curve defined by control_points at distance `distance` away.
# Control points is a 4x2 matrix where each row is a control point (x, y).
# No guarantee on distribution of sample points (todo: improve?).
sample_points = function(control_points, n, distance) {
    p0 = control_points[1, 1:2]
    p1 = control_points[2, 1:2]
    p2 = control_points[3, 1:2]
    p3 = control_points[4, 1:2]

    curvature = cubic_bezier_curvature_at(p0, p1, p2, p3, 0.5)

    points = matrix(NA, nrow=n, ncol=2)
    t_range = seq(0, 1, length=n)

    for (i in 1:n) {
        t = t_range[i]

        tangent_vector = matrix(cubic_bezier_derivative_at(p0, p1, p2, p3, t), nrow=1, ncol=2)
        normal_vector_norm = normalize(matrix(c(tangent_vector[2], -tangent_vector[1]), nrow=1, ncol=2))
        normal_vector = normal_vector_norm * distance

        if (curvature <= 0) {
            normal_point = bezier(t=t, p=control_points) - normal_vector
        } else {
            normal_point = bezier(t=t, p=control_points) + normal_vector
        }

        points[i, 1] = normal_point[1, 1]
        points[i, 2] = normal_point[1, 2]
    }

    return(points)
}

# Converts the output of bezierCurveFit to a 4x2 matrix of control points, where each row is a control point (x, y).
bezier_output_to_matrix = function(bezier_output) {
    p = bezier_output$p
    return(matrix(
        c(p[[1]], p[[2]]), nrow=4, ncol=2
    ))
}

# Reads the input from csv file.
read_input = function() {
    csv = read.csv("bezier_in.csv", header = FALSE)
    input = as.matrix(csv)
}

main = function() {
    num_sample_points = 100
    input = read_input()

    # Input has a header row, which is (distance, -1) 
    line_width = input[1][1]
    # The next 4 rows are control points of a cubic Bezier curve.
    control_points = input[2:5, 1:2]
    
    sampled_points = sample_points(control_points, num_sample_points, line_width)

    # For now, we are hardcoding fitting the curve with 2 cubic Bezier curves.
    first_half =  sampled_points[1                              : (num_sample_points %/% 2)      , 1 : 2]
    second_half = sampled_points[(num_sample_points %/% 2)      : num_sample_points              , 1 : 2]
    #middle_part = sampled_points[round(num_sample_points * 0.4) : round(num_sample_points * 0.6) , 1 : 2]

    # first_half =  sampled_points[1                         : round(num_sample_points * 0.6) , 1 : 2]
    # second_half = sampled_points[round(num_sample_points * 0.4) : num_sample_points         , 1 : 2]

    fitted_curve_1 = bezierCurveFit(first_half, min.control.points=4, max.control.points=4, fix.start.end=TRUE)
    fitted_curve_2 = bezierCurveFit(second_half, min.control.points=4, max.control.points=4, fix.start.end=TRUE)
    #middle_fitted_curve = bezierCurveFit(middle_part, min.control.points=4, max.control.points=4, fix.start.end=TRUE)

    header = matrix(c(2, -1), nrow=1, ncol=2)
    output = rbind(header, bezier_output_to_matrix(fitted_curve_1), bezier_output_to_matrix(fitted_curve_2))
    write.table(output, file="bezier_out.csv", sep = ",", row.names = FALSE, col.names = FALSE)
}

main()