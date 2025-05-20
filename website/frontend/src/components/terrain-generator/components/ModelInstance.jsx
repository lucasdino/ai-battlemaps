import React, { useRef, useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function ModelInstance({ url, position, scale, isSelected, onPointerDown, onPointerUp, onPointerMove }) {
    const ref = useRef();
    const [gltf, setGltf] = useState(null);

    useEffect(() => {
        const loader = new GLTFLoader();
        loader.load(url, setGltf);
    }, [url]);

    useEffect(() => {
        if (ref.current) {
            ref.current.position.set(...position);
            ref.current.scale.set(scale, scale, scale);
        }
    }, [position, scale]);

    if (!gltf) return null;
    return (
        <primitive
            ref={ref}
            object={gltf.scene}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            style={{ cursor: isSelected ? 'move' : 'pointer' }}
        />
    );
} 