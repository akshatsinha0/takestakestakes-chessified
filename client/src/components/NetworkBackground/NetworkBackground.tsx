import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './NetworkBackground.css';

// Fix the type definition to use a more generic approach
interface NodeUserData {
  velocity: THREE.Vector3;
  originalPosition: THREE.Vector3;
  [key: string]: any;
}

// Use a simpler approach with interface instead of complex type extension
interface NodeObject extends THREE.Mesh {
  userData: NodeUserData;
}

interface Connection {
  line: THREE.Line;
  nodeA: NodeObject;
  nodeB: NodeObject;
  geometry: THREE.BufferGeometry;
}

const NetworkBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef(new THREE.Vector2());
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    
    // Nodes and connections
    const nodeCount = 100;
    const nodes: NodeObject[] = [];
    const nodeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x3a85ff });
    
    const connections: Connection[] = [];
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x3a85ff, 
      transparent: true,
      opacity: 0.2
    });
    
    // Create nodes with the double-cast approach to fix the TypeScript error
    for (let i = 0; i < nodeCount; i++) {
      // Create a basic mesh
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      
      // Setup position
      node.position.x = (Math.random() - 0.5) * 10;
      node.position.y = (Math.random() - 0.5) * 6;
      node.position.z = (Math.random() - 0.5) * 2;
      
      // Set up userData with required properties
      node.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          0
        ),
        originalPosition: node.position.clone()
      };
      
      scene.add(node);
      
      // Use double-cast through unknown to satisfy TypeScript
      nodes.push(node as unknown as NodeObject);
    }
    
    // Create connections between nearby nodes
    for (let i = 0; i < nodeCount; i++) {
      const nodeA = nodes[i];
      for (let j = i + 1; j < nodeCount; j++) {
        const nodeB = nodes[j];
        const distance = nodeA.position.distanceTo(nodeB.position);
        
        if (distance < 2) {
          const geometry = new THREE.BufferGeometry().setFromPoints([
            nodeA.position,
            nodeB.position
          ]);
          const line = new THREE.Line(geometry, lineMaterial);
          scene.add(line);
          connections.push({ line, nodeA, nodeB, geometry });
        }
      }
    }
    
    // Mouse interaction
    const onMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    window.addEventListener('mousemove', onMouseMove);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Convert mouse position to 3D coordinates
      const mouseVector = new THREE.Vector3(
        mouse.current.x * 5,
        mouse.current.y * 3,
        0
      );
      
      // Update node positions with repulsion from mouse
      nodes.forEach(node => {
        const distanceToMouse = node.position.distanceTo(mouseVector);
        
        if (distanceToMouse < 2) {
          // Calculate repulsion direction
          const repulsionDirection = new THREE.Vector3()
            .subVectors(node.position, mouseVector)
            .normalize();
          
          // Apply repulsion force
          const repulsionStrength = 0.02 / Math.max(0.1, distanceToMouse * distanceToMouse);
          node.position.add(
            repulsionDirection.multiplyScalar(repulsionStrength)
          );
        }
        
        // Apply velocity
        node.position.add(node.userData.velocity);
        
        // Drift back to original position
        node.position.lerp(node.userData.originalPosition, 0.01);
        
        // Bounce off boundaries
        if (Math.abs(node.position.x) > 5) {
          node.userData.velocity.x *= -1;
        }
        if (Math.abs(node.position.y) > 3) {
          node.userData.velocity.y *= -1;
        }
      });
      
      // Update connections
      connections.forEach(({ line, nodeA, nodeB, geometry }) => {
        geometry.setFromPoints([
          nodeA.position,
          nodeB.position
        ]);
        geometry.attributes.position.needsUpdate = true;
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of geometries and materials
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineMaterial.dispose();
      connections.forEach(({ geometry }) => geometry.dispose());
    };
  }, []);
  
  return <div ref={containerRef} className="network-background" />;
};

export default NetworkBackground;
