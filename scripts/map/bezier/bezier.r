library(bezier)

cubic_bezier_derivative_at = function(p0, p1, p2, p3, t) {
    return(
        3 * ((1-t) ^ 2) * (p1 - p0)
        + 6 * (1-t) * t * (p2 - p1)
        + 3 * (t ^ 2) * (p3 - p2)
    )
}

normalize = function(vector) {
    return(vector / sqrt(sum(vector^2)))
}

sample_points = function(control_points, n, width) {
    p0 = control_points[1, 1:2]
    p1 = control_points[2, 1:2]
    p2 = control_points[3, 1:2]
    p3 = control_points[4, 1:2]

    points = matrix(NA, nrow=n, ncol=2)
    t_range = seq(0, 1, length=n)

    for (i in 1:n) {
        t = t_range[i]

        tangent_vector = matrix(cubic_bezier_derivative_at(p0, p1, p2, p3, t), nrow=1, ncol=2)
        normal_vector_norm = normalize(matrix(c(tangent_vector[2], -tangent_vector[1]), nrow=1, ncol=2))
        normal_vector = normal_vector_norm * width

        normal_point_1 = bezier(t=t, p=control_points) - normal_vector
        normal_point_2 = normal_point_1 + 2 * normal_vector

        points[i, 1] = normal_point_1[1, 1]
        points[i, 2] = normal_point_1[1, 2]
    }

    return(points)
}

bezier_output_to_matrix = function(bezier_output) {
    p = bezier_output$p
    return(matrix(
        c(p[[1]], p[[2]]), nrow=4, ncol=2
    ))
}

read_input = function() {
    csv = read.csv("bezier_in.csv", header = FALSE)
    input = as.matrix(csv)
}

main = function() {
    num_sample_points = 100
    input = read_input()

    line_width = input[1][1]
    control_points = input[2:5, 1:2]
    
    t = seq(0, 1, length=num_sample_points)
    plot(bezier(t=t, p=control_points), asp=1)

    sampled_points = sample_points(control_points, num_sample_points, line_width)

    for (i in 1:num_sample_points) {
        points(sampled_points[i, 1], sampled_points[i, 2], col=2)
    }

    print(nrow(sampled_points))
    first_half = sampled_points[1:num_sample_points %/% 2, 1:2]
    second_half = sampled_points[51 : 100, 1:2]

    fitted_curve_1 = bezierCurveFit(first_half, min.control.points=4, max.control.points=4, fix.start.end=TRUE)
    fitted_curve_2 = bezierCurveFit(second_half, min.control.points=4, max.control.points=4, fix.start.end=TRUE)
    points(bezier(t=t, p=fitted_curve_1$p), asp=1, col=3)
    points(bezier(t=t, p=fitted_curve_2$p), asp=1, col=3)

    print(fitted_curve_1)
    print(bezier_output_to_matrix(fitted_curve_1))

    header = matrix(c(55, 66), nrow=1, ncol=2)
    print(rbind(header, bezier_output_to_matrix(fitted_curve_1), bezier_output_to_matrix(fitted_curve_2)))
}

main()

#print(fitted_curve_2)