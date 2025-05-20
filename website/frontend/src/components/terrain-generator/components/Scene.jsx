import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { TerrainMesh } from './TerrainMesh';
import { ModelInstance } from './ModelInstance';

export function Scene({
    guiParams,
    placedModels = [],
    setPlacedModels = () => {},
    placementMode,
    setPlacementMode,
    selectedModelId,
    setSelectedModelId,
    selectedModelScale,
    setSelectedModelScale
}) {
    const { camera, scene, gl } = useThree();
    const controlsRef = useRef();
    const materialRef = useRef();
    const dragRef = useRef({
        screenCoords: new THREE.Vector2(),
        prevWorldCoords: new THREE.Vector3(),
        worldCoords: new THREE.Vector3(),
        raycaster: new THREE.Raycaster(),
        down: false,
        hover: false,
        object: null,
        getIntersect: function() {
            this.raycaster.setFromCamera(this.screenCoords, camera);
            const intersects = this.raycaster.intersectObject(this.object);
            return intersects.length ? intersects[0] : null;
        }
    });
    const [draggedModelId, setDraggedModelId] = useState(null);
    const [dragOffset, setDragOffset] = useState([0, 0, 0]);
    
    useEffect(() => {
        camera.position.set(-10, 8, -2.2);
        camera.lookAt(0, 0, 0);

        const rgbeLoader = new RGBELoader();
        rgbeLoader.load('/textures/equirectangular/pedestrian_overpass_1k.hdr', (environmentMap) => {
            environmentMap.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = environmentMap;
            scene.backgroundBlurriness = 0.5;
            scene.environment = environmentMap;
        });

        const dragObject = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10, 1, 1),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        dragObject.rotation.x = -Math.PI * 0.5;
        scene.add(dragObject);
        dragRef.current.object = dragObject;

        const handlePointerMove = (event) => {
            dragRef.current.screenCoords.x = (event.clientX / window.innerWidth - 0.5) * 2;
            dragRef.current.screenCoords.y = -(event.clientY / window.innerHeight - 0.5) * 2;
        };

        const handlePointerDown = () => {
            if (dragRef.current.hover) {
                gl.domElement.style.cursor = 'grabbing';
                controlsRef.current.enabled = false;
                dragRef.current.down = true;
                dragRef.current.object.scale.setScalar(10);

                const intersect = dragRef.current.getIntersect();
                if (intersect) {
                    dragRef.current.prevWorldCoords.copy(intersect.point);
                    dragRef.current.worldCoords.copy(intersect.point);
                }
            }
        };

        const handlePointerUp = () => {
            dragRef.current.down = false;
            controlsRef.current.enabled = true;
            dragRef.current.object.scale.setScalar(1);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [camera, scene, gl]);

    useFrame(() => {
        if (dragRef.current.object) {
            dragRef.current.raycaster.setFromCamera(dragRef.current.screenCoords, camera);
            const intersects = dragRef.current.raycaster.intersectObject(dragRef.current.object);
            
            if (intersects.length) {
                dragRef.current.hover = true;
                if (!dragRef.current.down) {
                    gl.domElement.style.cursor = 'grab';
                }
            } else {
                dragRef.current.hover = false;
                gl.domElement.style.cursor = 'default';
            }

            if (dragRef.current.hover && dragRef.current.down) {
                const intersect = intersects[0];
                dragRef.current.worldCoords.copy(intersect.point);
                const delta = dragRef.current.prevWorldCoords.sub(dragRef.current.worldCoords);
                
                if (materialRef.current) {
                    materialRef.current.uniforms.offset.value.x += delta.x;
                    materialRef.current.uniforms.offset.value.y += delta.z;
                }
            }

            dragRef.current.prevWorldCoords.copy(dragRef.current.worldCoords);
        }
    });

    const handlePointerDown = (event) => {
        if (placementMode) {
            const [x, y, z] = [event.point.x, event.point.y, event.point.z];
            setPlacedModels(models => [
                ...models,
                {
                    id: `${placementMode.id}-${Date.now()}`,
                    url: placementMode.url,
                    position: [x, y, z],
                    scale: 1
                }
            ]);
            setPlacementMode(null);
        } else {
            const intersected = event.intersections.find(i => i.object.userData.modelId);
            if (intersected) {
                setSelectedModelId(intersected.object.userData.modelId);
                setDraggedModelId(intersected.object.userData.modelId);
                setDragOffset([
                    intersected.point.x - intersected.object.position.x,
                    intersected.point.y - intersected.object.position.y,
                    intersected.point.z - intersected.object.position.z
                ]);
            } else {
                setSelectedModelId(null);
            }
        }
    };

    const handlePointerMove = (event) => {
        if (draggedModelId) {
            setPlacedModels(models => models.map(m =>
                m.id === draggedModelId
                    ? { ...m, position: [event.point.x - dragOffset[0], event.point.y - dragOffset[1], event.point.z - dragOffset[2]] }
                    : m
            ));
        }
    };

    const handlePointerUp = () => {
        setDraggedModelId(null);
    };

    useEffect(() => {
        if (!selectedModelId) return;
        const gui = new GUI();
        const selected = placedModels.find(m => m.id === selectedModelId);
        if (!selected) return;
        gui.add(selected, 'scale', 0.1, 5, 0.01).name('Scale').onChange(value => {
            setPlacedModels(models => models.map(m => m.id === selectedModelId ? { ...m, scale: value } : m));
            setSelectedModelScale(value);
        });
        return () => gui.destroy();
    }, [selectedModelId, placedModels, setPlacedModels, setSelectedModelScale]);

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[6.25, 3, 4]}
                intensity={2}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-near={0.1}
                shadow-camera-far={30}
                shadow-camera-top={8}
                shadow-camera-right={8}
                shadow-camera-bottom={-8}
                shadow-camera-left={-8}
                shadow-normalBias={0.05}
                shadow-bias={0}
            />
            <pointLight position={[-10, 10, -5]} intensity={0.5} />
            <Environment preset="sunset" />
            <Sky
                distance={450000}
                sunPosition={[0, 1, 0]}
                inclination={0}
                azimuth={0.25}
            />
            <TerrainMesh guiParams={guiParams} materialRef={materialRef} />
            <OrbitControls
                ref={controlsRef}
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={0.1}
                maxDistance={50}
                maxPolarAngle={Math.PI * 0.45}
                target={[0, -0.5, 0]}
                enableDamping={true}
            />
            {(placedModels || []).map(model => (
                <ModelInstance
                    key={model.id}
                    url={model.url}
                    position={model.position}
                    scale={model.scale}
                    isSelected={selectedModelId === model.id}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerMove={handlePointerMove}
                />
            ))}
        </>
    );
} 