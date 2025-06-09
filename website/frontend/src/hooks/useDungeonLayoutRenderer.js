import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { disposeObject } from '../utils/threeSceneUtils';

// --- NEW: Texture Loader ---
const textureLoader = new THREE.TextureLoader();

// --- NEW: Load textures (paths are relative to the 'public' folder) ---
const floorTexture = textureLoader.load('/textures/stone_floor.jpg');
const wallTexture = textureLoader.load('/textures/stone_wall.jpg');

// --- NEW: Configure texture wrapping for tiling ---
[floorTexture, wallTexture].forEach(t => {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
});

/**
 * Hook to render dungeon floors and walls based on a 2D grid definition.
 *
 * @param {Object} params
 * @param {React.MutableRefObject} params.sceneRef - Ref to the Three.js scene
 * @param {Array<Array<string|number>>} params.dungeonGrid - 2-D array describing each cell
 * @param {number} [params.cellSize=1] - World-space size for each grid cell (x & z)
 * @param {number} [params.floorHeight=0.3] - Height (thickness) of floor blocks
 * @param {number} [params.wallHeight=2] - Height of walls (y-axis)
 */
export const useDungeonLayoutRenderer = ({
  sceneRef,
  dungeonGrid,
  cellSize = 1,
  floorHeight = 0.3,
  wallHeight = 2,
}) => {
  const groupRef = useRef(null);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Clean up previous group
    if (groupRef.current) {
      sceneRef.current.remove(groupRef.current);
      disposeObject(groupRef.current);
      groupRef.current = null;
    }

    if (!Array.isArray(dungeonGrid) || dungeonGrid.length === 0) {
      return; // nothing to render
    }

    const rows = dungeonGrid.length;
    const cols = dungeonGrid[0].length;

    const newGroup = new THREE.Group();
    newGroup.name = 'DungeonLayoutGroup';

    // Geometries and Materials
    const floorGeometry = new THREE.BoxGeometry(cellSize, floorHeight, cellSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xcccccc, // Tint the texture slightly grey
      map: floorTexture 
    });

    const wallGeometry = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xbbbbbb, // Tint the texture slightly grey
      map: wallTexture
    });

    const floorPositions = [];
    const wallPositions = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const rawVal = dungeonGrid[row][col];
        const valStr = String(rawVal);

        if (valStr === '0') continue; // empty

        const centerX = (col - cols / 2 + 0.5) * cellSize;
        const centerZ = (row - rows / 2 + 0.5) * cellSize;

        // Add floor for non-zero cells
        floorPositions.push({ x: centerX, y: floorHeight / 2, z: centerZ });

        // Add wireframe wall for value '2'
        if (valStr === '2') {
          wallPositions.push({ x: centerX, y: wallHeight / 2 + floorHeight, z: centerZ });
        }
      }
    }

    // Create instanced mesh for floors
    if (floorPositions.length > 0) {
      const floorInstancedMesh = new THREE.InstancedMesh(floorGeometry, floorMaterial, floorPositions.length);
      floorInstancedMesh.name = "DungeonFloors";
      floorInstancedMesh.receiveShadow = false;
      floorInstancedMesh.castShadow = false;

      const dummy = new THREE.Object3D();
      floorPositions.forEach((pos, i) => {
        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.updateMatrix();
        floorInstancedMesh.setMatrixAt(i, dummy.matrix);
      });
      floorInstancedMesh.instanceMatrix.needsUpdate = true;
      newGroup.add(floorInstancedMesh);
    }
    
    // Create instanced mesh for walls
    if (wallPositions.length > 0) {
      const wallInstancedMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallPositions.length);
      wallInstancedMesh.name = "DungeonWalls";
      wallInstancedMesh.castShadow = false;
      wallInstancedMesh.receiveShadow = false;
      
      const dummy = new THREE.Object3D();
      wallPositions.forEach((pos, i) => {
        dummy.position.set(pos.x, pos.y, pos.z);
        dummy.updateMatrix();
        wallInstancedMesh.setMatrixAt(i, dummy.matrix);
      });
      wallInstancedMesh.instanceMatrix.needsUpdate = true;
      newGroup.add(wallInstancedMesh);
    }


    sceneRef.current.add(newGroup);
    groupRef.current = newGroup;

    // Cleanup on unmount / dependency change
    return () => {
      if (groupRef.current && sceneRef.current) {
        sceneRef.current.remove(groupRef.current);
        disposeObject(groupRef.current);
        groupRef.current = null;
      }
    };
  }, [sceneRef, dungeonGrid, cellSize, floorHeight, wallHeight]);
}; 