import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { vertexShader, fragmentShader } from '../shaders/terrainShaders';

export function TerrainMesh({ guiParams, materialRef }) {
    const meshRef = useRef();
    
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.001;
        }
    });

    const geometry = useMemo(() => {
        const geo = new THREE.PlaneGeometry(10, 10, 500, 500);
        geo.deleteAttribute('uv');
        geo.deleteAttribute('normal');
        geo.rotateX(-Math.PI * 0.5);
        return geo;
    }, []);

    const material = useMemo(() => {
        const material = new THREE.ShaderMaterial({
            uniforms: {
                noiseIterations: { value: guiParams.noiseIterations },
                positionFrequency: { value: guiParams.positionFrequency },
                warpFrequency: { value: guiParams.warpFrequency },
                warpStrength: { value: guiParams.warpStrength },
                strength: { value: guiParams.strength },
                offset: { value: new THREE.Vector2(0, 0) },
                normalLookUpShift: { value: 0.01 },
                colorSand: { value: new THREE.Color(guiParams.colorSand) },
                colorGrass: { value: new THREE.Color(guiParams.colorGrass) },
                colorSnow: { value: new THREE.Color(guiParams.colorSnow) },
                colorRock: { value: new THREE.Color(guiParams.colorRock) },
                time: { value: 0 }
            },
            vertexShader,
            fragmentShader
        });
        
        materialRef.current = material;
        return material;
    }, [guiParams, materialRef]);

    return (
        <mesh ref={meshRef} geometry={geometry} material={material} castShadow receiveShadow />
    );
} 