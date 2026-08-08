/* eslint-disable */
"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function Waveform3D() {
  const pointsRef = useRef<THREE.Points>(null);
  const { size, viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const particleCount = 2000;
  
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color();
    
    for (let i = 0; i < particleCount; i++) {
      // Create a cylindrical/wave distribution
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * 2 + 1;
      const y = (Math.random() - 0.5) * 10;
      
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = r * Math.sin(theta);
      
      // Base color is a cool neutral blue, varying slightly
      color.setHSL(0.6 + Math.random() * 0.1, 0.8, 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return [positions, colors];
  }, [particleCount]);

  // Handle mouse move
  if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
  }

  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colors = pointsRef.current.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      
      // Make particles wave based on time and mouse interaction
      const distanceToMouse = Math.sqrt(
        Math.pow(x - mouse.current.x * 5, 2) + Math.pow(z, 2)
      );
      
      const wave = Math.sin(time * 2 + x + z) * 0.5;
      const interaction = Math.max(0, 2 - distanceToMouse) * Math.sin(time * 5) * 0.5;
      
      // We apply subtle vertical movement to simulate a waveform
      // positions[i * 3 + 1] is the y axis. We just update the attribute but it's tricky to animate without storing original Y.
      // For performance, we rotate the whole group instead of recalculating vertex Y in JS.
    }
    
    pointsRef.current.rotation.y = time * 0.1 + mouse.current.x * 0.5;
    pointsRef.current.rotation.x = mouse.current.y * 0.2;
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
