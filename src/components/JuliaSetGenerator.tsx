"use client"

import React, { useEffect, useRef, useState } from 'react';
import { fragmentShaderSource, vertexShaderSource } from './juliaSetShader';



const JuliaSetGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const [c, setC] = useState({ real: -0.7, imag: 0.27015 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [maxIterations, setMaxIterations] = useState(300);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    glRef.current = gl;

    const createShader = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Failed to create shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw new Error('Failed to compile shader');
      }
      return shader;
    };

    const createProgram = (vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram => {
      const program = gl.createProgram();
      if (!program) throw new Error('Failed to create program');
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
        throw new Error('Failed to link program');
      }
      return program;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(vertexShader, fragmentShader);
    programRef.current = program;

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
      -1, -1,
      1, -1,
      -1, 1,
      1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const scale = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * scale;
    canvas.height = canvas.clientHeight * scale;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    canvas.style.cursor = 'grab';
  }, []);

  useEffect(() => {
    const render = () => {
      const gl = glRef.current;
      const program = programRef.current;
      const canvas = canvasRef.current;
      if (!gl || !program || !canvas) return;

      canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
      const cUniformLocation = gl.getUniformLocation(program, 'u_c');
      const zoomUniformLocation = gl.getUniformLocation(program, 'u_zoom');
      const panUniformLocation = gl.getUniformLocation(program, 'u_pan');
      const maxIterationsUniformLocation = gl.getUniformLocation(program, 'u_max_iterations');

      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(cUniformLocation, c.real, c.imag);
      gl.uniform1f(zoomUniformLocation, zoom);
      gl.uniform2f(panUniformLocation, center.x, center.y);
      gl.uniform1i(maxIterationsUniformLocation, maxIterations);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    render();
  }, [c, zoom, center, maxIterations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomPoint = {
        x: (mouseX / canvas.width) * 2 - 1,
        y: -((mouseY / canvas.height) * 2 - 1)
      };

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(1e-10, Math.min(zoom * zoomFactor, 1e10));

      const newCenter = {
        x: center.x + (zoomPoint.x - center.x) * (1 - zoomFactor),
        y: center.y + (zoomPoint.y - center.y) * (1 - zoomFactor)
      };

      setCenter(newCenter);
      setZoom(newZoom);
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const dx = (e.clientX - lastMousePos.current.x);
        const dy = (e.clientY - lastMousePos.current.y);
        
        // Adjust panning speed based on zoom level
        const panSpeed = 2;
        setCenter(prev => ({
          x: prev.x + dx / canvas.width * 2 * panSpeed,
          y: prev.y - dy / canvas.height * 2 * panSpeed
        }));
        
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [zoom, center]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="w-full bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center text-purple-400 mb-4">Julia Set Explorer</h1>
        <div className="flex flex-wrap justify-center items-center gap-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium text-gray-300">Real:</label>
            <input
              type="number"
              step="0.01"
              value={c.real}
              onChange={(e) => setC({ ...c, real: parseFloat(e.target.value) })}
              className="w-24 p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium text-gray-300">Imaginary:</label>
            <input
              type="number"
              step="0.01"
              value={c.imag}
              onChange={(e) => setC({ ...c, imag: parseFloat(e.target.value) })}
              className="w-24 p-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <div className="flex items-center">
            <label className="mr-2 text-sm font-medium text-gray-300">Max Iterations:</label>
            <input
              type="range"
              min="5"
              max="350"
              value={maxIterations}
              onChange={(e) => setMaxIterations(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="ml-2 text-sm">{maxIterations}</span>
          </div>
        </div>
      </div>
      
      <div className="flex-grow flex justify-center items-center p-4">
        <div className="w-full max-w-6xl aspect-[16/9] relative">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
          />
        </div>
      </div>
      
      <div className="bg-gray-800 p-2 text-center text-xs text-gray-400">
        Drag to pan, scroll to zoom
      </div>
    </div>
  );
};

export default JuliaSetGenerator;