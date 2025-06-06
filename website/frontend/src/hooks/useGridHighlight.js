import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { eventBus, EVENTS } from '../events/eventBus';
import { disposeObject } from '../utils/threeSceneUtils';

export const useGridHighlight = ({ sceneRef }) => {
  const highlightSquareRef = useRef(null);

  // Create or update highlight square
  const createHighlightSquare = useCallback((position, size, isOccupied = false) => {
    if (!sceneRef.current) return;

    // Remove existing highlight
    if (highlightSquareRef.current) {
      sceneRef.current.remove(highlightSquareRef.current);
      disposeObject(highlightSquareRef.current);
      highlightSquareRef.current = null;
    }

    // Create new highlight square
    const squareGeometry = new THREE.PlaneGeometry(size.x * 0.95, size.z * 0.95);
    const squareMaterial = new THREE.MeshBasicMaterial({
      color: isOccupied ? 0xff0000 : 0x00ff00, // Red if occupied, green if available
      transparent: true,
      opacity: isOccupied ? 0.5 : 0.3,
      side: THREE.DoubleSide
    });
    
    const highlightSquare = new THREE.Mesh(squareGeometry, squareMaterial);
    highlightSquare.position.set(position.x, 0.01, position.z); // Slightly above ground
    highlightSquare.rotation.x = -Math.PI / 2; // Rotate to lie flat
    
    sceneRef.current.add(highlightSquare);
    highlightSquareRef.current = highlightSquare;
  }, [sceneRef]);

  // Clear highlight square
  const clearHighlightSquare = useCallback(() => {
    if (highlightSquareRef.current && sceneRef.current) {
      sceneRef.current.remove(highlightSquareRef.current);
      disposeObject(highlightSquareRef.current);
      highlightSquareRef.current = null;
    }
  }, [sceneRef]);

  // Set up event listeners
  useEffect(() => {
    const handleHighlight = ({ position, size, isOccupied }) => {
      createHighlightSquare(position, size, isOccupied);
    };

    const handleClearHighlight = () => {
      clearHighlightSquare();
    };

    eventBus.on(EVENTS.GRID_HIGHLIGHT, handleHighlight);
    eventBus.on(EVENTS.GRID_CLEAR_HIGHLIGHT, handleClearHighlight);

    return () => {
      eventBus.off(EVENTS.GRID_HIGHLIGHT, handleHighlight);
      eventBus.off(EVENTS.GRID_CLEAR_HIGHLIGHT, handleClearHighlight);
    };
  }, [createHighlightSquare, clearHighlightSquare]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlightSquare();
    };
  }, [clearHighlightSquare]);

  return {
    clearHighlightSquare
  };
}; 