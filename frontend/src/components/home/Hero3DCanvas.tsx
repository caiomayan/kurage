"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX_SHADER = `
uniform float uTime;
uniform vec2 uMouse;

varying vec2 vUv;
varying float vElevation;
varying vec3 vViewPosition;

// Classic Perlin 3D Noise by Stefan Gustavson
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec3 P){
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod(Pi0, 289.0);
  Pi1 = mod(Pi1, 289.0);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 / 7.0;
  vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 / 7.0;
  vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Abyssal Wave simulation
  float noiseFreq = 0.35;
  float noiseAmp = 0.8;
  vec3 noisePos = vec3(pos.x * noiseFreq + uTime * 0.1, pos.y * noiseFreq + uTime * 0.15, uTime * 0.15);
  
  float elevation = cnoise(noisePos) * noiseAmp;
  
  // Secondary details
  elevation += cnoise(noisePos * 2.5 - vec3(0.0, 0.0, uTime * 0.2)) * (noiseAmp * 0.25);
  
  // Fluid reaction to mouse
  float distX = pos.x - (uMouse.x * 6.0);
  float distY = pos.y - (uMouse.y * 6.0);
  float dist = sqrt(distX*distX + distY*distY);
  float mouseInfluence = smoothstep(4.0, 0.0, dist);
  elevation += mouseInfluence * 0.6;

  pos.z += elevation;
  vElevation = elevation;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = `
uniform vec3 uColorStart;
uniform vec3 uColorEnd;
uniform vec3 uLightColor;

varying vec2 vUv;
varying float vElevation;
varying vec3 vViewPosition;

void main() {
  // Map elevation to a smooth gradient
  float mixStrength = (vElevation + 0.6) * 0.8;
  mixStrength = smoothstep(0.0, 1.0, mixStrength);
  vec3 color = mix(uColorStart, uColorEnd, mixStrength);
  
  // Calculate analytic normal from view position derivatives (simulates glossy fluid surface)
  vec3 fdx = dFdx(vViewPosition);
  vec3 fdy = dFdy(vViewPosition);
  vec3 normal = normalize(cross(fdx, fdy));
  
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel / Rim Light effect
  float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
  fresnel = pow(fresnel, 3.0); // Sharpen the rim
  
  // Add specular highlights at the peaks
  float specular = pow(max(dot(normal, normalize(vec3(0.5, 0.5, 1.0))), 0.0), 30.0);
  
  color += uLightColor * fresnel * 0.6;
  color += uLightColor * specular * 0.4;

  // Seamless radial fade out to blend with background
  float distToCenter = distance(vUv, vec2(0.5));
  float alpha = smoothstep(0.5, 0.2, distToCenter);
  
  gl_FragColor = vec4(color, alpha * 0.95);
}
`;

export function Hero3DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const isConstrainedDevice =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) ||
      (deviceMemory !== undefined && deviceMemory <= 4);

    const scene = new THREE.Scene();
    
    // Position camera looking down slightly at an angle
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, -3, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false, // Turned off for raw performance (noise handles edges natively well via fade)
      powerPreference: "high-performance",
    });
    
    renderer.setSize(width, height);
    // The original 1.5 DPR / 256x256 mesh is costly on integrated laptop GPUs.
    // Start with a high-quality cap, then lower it only if real frame time requires it.
    renderer.setPixelRatio(isConstrainedDevice ? 1 : Math.min(window.devicePixelRatio, 1.25));

    // Determine segments based on screen size (mobile needs less to maintain 60fps)
    const isMobile = width < 768;
    const segments = isConstrainedDevice || isMobile ? 96 : 144;

    // The Abyssal Silk Plane
    const geometry = new THREE.PlaneGeometry(16, 16, segments, segments);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        // Obsidian / Deep Sea color palette
        uColorStart: { value: new THREE.Color("#020406") },
        uColorEnd: { value: new THREE.Color("#0c151c") },
        // Brand color (Kurage cyan/silver)
        uLightColor: { value: new THREE.Color("var(--kurage-accent)") },
      },
    });

    const mesh = new THREE.Mesh(geometry, material);
    // Tilt the plane so it flows "towards" the camera like an ocean
    mesh.rotation.x = -Math.PI * 0.25; 
    scene.add(mesh);

    // Bioluminescent Data Particles (Jellyfish spores)
    const particleCount = isConstrainedDevice || isMobile ? 80 : 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 12;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 8 - 2;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 4 + 1; // Float above the silk
      particleSpeeds[i] = 0.2 + Math.random() * 0.5;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute('aSpeed', new THREE.BufferAttribute(particleSpeeds, 1));

    // Custom Particle Shader
    const particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("var(--kurage-accent)") }
      },
      vertexShader: `
        uniform float uTime;
        attribute float aSpeed;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          // Slowly drift upwards
          pos.y += uTime * aSpeed * 0.5;
          // Wrap around
          pos.y = mod(pos.y + 6.0, 12.0) - 6.0;
          
          // Gentle sway
          pos.x += sin(uTime * aSpeed + pos.y) * 0.5;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Point size based on depth
          gl_PointSize = (12.0 * aSpeed) / -mvPosition.z;
          
          // Fade based on height
          vAlpha = smoothstep(-4.0, 0.0, pos.y) * smoothstep(4.0, 0.0, pos.y);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          if (dist > 0.5) discard;
          
          // Soft glowing circle
          float strength = 1.0 - (dist * 2.0);
          strength = pow(strength, 1.5);
          
          gl_FragColor = vec4(uColor, strength * vAlpha * 0.6);
        }
      `
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Interaction
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetMouseX = x;
      targetMouseY = y;
    };

    container.addEventListener("pointermove", handleMouseMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    let animationFrameId: number | null = null;
    let isIntersecting = true;
    let isPageVisible = document.visibilityState === "visible";
    let isRendering = false;
    let elapsedTime = 0;
    let previousFrameTime = 0;
    let sampledFrames = 0;
    let slowFrames = 0;
    let reducedQuality = isConstrainedDevice;

    const reduceQuality = () => {
      if (reducedQuality) return;
      reducedQuality = true;
      particles.visible = false;
      renderer.setPixelRatio(0.85);
      renderer.setSize(width, height, false);
    };

    const animate = (frameTime: number) => {
      if (!isRendering) return;
      animationFrameId = requestAnimationFrame(animate);

      if (previousFrameTime !== 0) {
        const frameDuration = frameTime - previousFrameTime;
        elapsedTime += Math.min(frameDuration / 1000, 0.05);
        if (!reducedQuality && frameDuration > 22) slowFrames += 1;
        sampledFrames += 1;
        if (sampledFrames === 120 && slowFrames > 18) reduceQuality();
      }
      previousFrameTime = frameTime;

      // Smooth mouse interpolation (lerp)
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Update uniforms
      material.uniforms.uTime.value = elapsedTime;
      material.uniforms.uMouse.value.set(currentMouseX, currentMouseY);
      
      particleMat.uniforms.uTime.value = elapsedTime;

      renderer.render(scene, camera);
    };

    const updateRenderState = () => {
      const shouldRender = isIntersecting && isPageVisible;
      if (shouldRender === isRendering) return;
      isRendering = shouldRender;
      previousFrameTime = 0;
      if (shouldRender) {
        animationFrameId = requestAnimationFrame(animate);
      } else if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        updateRenderState();
      },
      { threshold: 0.02 },
    );
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
      updateRenderState();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    updateRenderState();

    return () => {
      isRendering = false;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      container.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      
      geometry.dispose();
      material.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full select-none">
      <canvas ref={canvasRef} className="h-full w-full outline-none block" />
    </div>
  );
}
