import React, { useEffect, useRef, useState } from 'react';

const nodeColors = {
  local: 0x34d399,
  web: 0x60a5fa,
};

function fibonacciPoint(index, total, radius) {
  const offset = 2 / total;
  const increment = Math.PI * (3 - Math.sqrt(5));
  const y = index * offset - 1 + offset / 2;
  const r = Math.sqrt(1 - y * y);
  const phi = index * increment;

  return {
    x: Math.cos(phi) * r * radius,
    y: y * radius,
    z: Math.sin(phi) * r * radius,
  };
}

function createGlowTexture(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.25, 'rgba(96,165,250,0.8)');
  gradient.addColorStop(0.65, 'rgba(59,130,246,0.22)');
  gradient.addColorStop(1, 'rgba(59,130,246,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  return new THREE.CanvasTexture(canvas);
}

export function HolographicGlobe({ models }) {
  const mountRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let frameId = 0;
    let cleanup = () => {};

    import('three').then((THREE) => {
      if (disposed || !mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.15, 5.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'hologram-canvas';
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ambientLight = new THREE.AmbientLight(0x60a5fa, 0.75);
    const rimLight = new THREE.PointLight(0x38bdf8, 2.1, 18);
    rimLight.position.set(3.2, 2.4, 4.4);
    scene.add(ambientLight, rimLight);

    const globeGeometry = new THREE.SphereGeometry(1.52, 48, 48);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0f2a5f,
      transparent: true,
      opacity: 0.16,
      wireframe: true,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    group.add(globe);

    const shellGeometry = new THREE.SphereGeometry(1.49, 32, 32);
    const shellMaterial = new THREE.MeshPhongMaterial({
      color: 0x082f49,
      emissive: 0x0b4a77,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.28,
      shininess: 72,
      depthWrite: false,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    group.add(shell);

    const pointPositions = [];
    const pointCount = 360;
    for (let index = 0; index < pointCount; index += 1) {
      const point = fibonacciPoint(index, pointCount, 1.56);
      pointPositions.push(point.x, point.y, point.z);
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.018,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    group.add(points);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
    });
    const orbitGroup = new THREE.Group();
    const ringDisposables = [];
    [1.9, 2.14].forEach((radius, index) => {
      const ringGeometry = new THREE.RingGeometry(radius, radius + 0.004, 96);
      const ringEdges = new THREE.EdgesGeometry(ringGeometry);
      const ring = new THREE.LineSegments(ringEdges, ringMaterial);
      ring.rotation.x = index === 0 ? Math.PI / 2.8 : Math.PI / 2.15;
      ring.rotation.y = index === 0 ? Math.PI / 10 : -Math.PI / 7;
      orbitGroup.add(ring);
      ringDisposables.push(ringGeometry, ringEdges);
    });
    group.add(orbitGroup);

    const glowTexture = createGlowTexture(THREE);
    const nodeMeshes = models.map((model, index) => {
      const position = fibonacciPoint(index, models.length, 1.72);
      const nodeGroup = new THREE.Group();
      nodeGroup.position.set(position.x, position.y, position.z);
      nodeGroup.lookAt(0, 0, 0);

      const color = nodeColors[model.source] ?? 0x60a5fa;
      const nodeGeometry = new THREE.SphereGeometry(0.055, 18, 18);
      const nodeMaterial = new THREE.MeshBasicMaterial({ color });
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.userData.model = model;

      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Sprite(glowMaterial);
      glow.scale.set(0.46, 0.46, 0.46);

      nodeGroup.add(glow, node);
      group.add(nodeGroup);
      return { model, node, glow, group: nodeGroup, baseScale: 1 };
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(2, 2);
    const canvasPoint = { x: 0, y: 0 };
    let activeNode = null;
    let lastFrame = 0;

    const resize = () => {
      const size = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(size.width));
      const height = Math.max(1, Math.floor(size.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updatePointer = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const inBounds =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!inBounds) {
        pointer.set(2, 2);
        canvasPoint.x = event.clientX;
        canvasPoint.y = event.clientY;
        return;
      }

      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      canvasPoint.x = event.clientX;
      canvasPoint.y = event.clientY;
    };

    const clearActiveNode = () => {
      if (activeNode) {
        activeNode.node.scale.setScalar(1);
        activeNode.glow.scale.set(0.46, 0.46, 0.46);
        activeNode = null;
        setTooltip(null);
      }
    };

    const animate = (time) => {
      frameId = window.requestAnimationFrame(animate);
      if (time - lastFrame < 33) return;
      lastFrame = time;

      group.rotation.y += 0.0032;
      orbitGroup.rotation.z += 0.0012;
      points.rotation.y -= 0.0009;

      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(nodeMeshes.map((item) => item.node), false);
      const nextActive = intersections[0]
        ? nodeMeshes.find((item) => item.node === intersections[0].object)
        : null;

      if (nextActive !== activeNode) {
        clearActiveNode();
        activeNode = nextActive;
        if (activeNode) {
          activeNode.node.scale.setScalar(1.7);
          activeNode.glow.scale.set(0.72, 0.72, 0.72);
          setTooltip({
            name: activeNode.model.name,
            source: activeNode.model.source === 'local' ? 'Local' : 'Web',
            x: canvasPoint.x,
            y: canvasPoint.y,
          });
        }
      } else if (activeNode && tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${canvasPoint.x - 12}px, ${canvasPoint.y - 44}px, 0)`;
      }

      renderer.render(scene, camera);
    };

    resize();
    animate(0);
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', updatePointer, { passive: true });

    cleanup = () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', updatePointer);

      nodeMeshes.forEach(({ node, glow }) => {
        node.geometry.dispose();
        node.material.dispose();
        glow.material.dispose();
      });
      glowTexture.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      ringDisposables.forEach((item) => item.dispose());
      ringMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [models]);

  return (
    <div className="hologram-globe" ref={mountRef}>
      {tooltip ? (
        <div
          className="globe-tooltip"
          ref={tooltipRef}
          style={{ transform: `translate3d(${tooltip.x - 12}px, ${tooltip.y - 44}px, 0)` }}
        >
          <strong>{tooltip.name}</strong>
          <span>{tooltip.source}</span>
        </div>
      ) : null}
    </div>
  );
}
