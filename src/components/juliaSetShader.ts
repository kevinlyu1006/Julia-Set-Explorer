export const vertexShaderSource = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const fragmentShaderSource = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_c;
uniform float u_zoom;
uniform vec2 u_pan;
uniform int u_max_iterations;

// Gradient color from dark blue (outer) to red (inner) to purple
vec3 gradientColor(float t) {
    vec3 darkBlue = vec3(0.0, 0.0, 0.2);
    vec3 lightBlue = vec3(0.0, 0.5, 1.0);
    vec3 green = vec3(0.0, 1.0, 0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.0);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 red = vec3(1.0, 0.0, 0.0);
    vec3 purple = vec3(0.5, 0.0, 0.5);

    if (t < 0.16667) {
        return mix(darkBlue, lightBlue, t * 6.0);
    } else if (t < 0.33333) {
        return mix(lightBlue, green, (t - 0.16667) * 6.0);
    } else if (t < 0.5) {
        return mix(green, yellow, (t - 0.33333) * 6.0);
    } else if (t < 0.66667) {
        return mix(yellow, orange, (t - 0.5) * 6.0);
    } else if (t < 0.83333) {
        return mix(orange, red, (t - 0.66667) * 6.0);
    } else {
        return mix(red, purple, (t - 0.83333) * 6.0);
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;
    vec2 z = (uv - u_pan) / u_zoom;
    int iterations = 0;
    float escape_radius = 2.0;

    for (int i = 0; i < 350; i++) {
        if (i >= u_max_iterations) break;
        if (length(z) > escape_radius) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + u_c;
        iterations = i + 1;
    }

    // Smooth color based on the number of iterations
    float t = float(iterations) / float(u_max_iterations);
    float smooth = log2(log2(length(z))) / 2.0;
    t = t + smooth * 0.5;

    // Determine color based on iteration count
    vec3 color;
    if (iterations == u_max_iterations) {
        color = vec3(0.0, 0.0, 0.0); // Black for points inside the set
    } else {
        color = gradientColor(t);
    }

    gl_FragColor = vec4(color, 1.0);
}
`;