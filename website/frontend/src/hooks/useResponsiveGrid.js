import { useState, useEffect, useCallback } from 'react';
import { GRID_ITEM_HEIGHT, GRID_ITEM_WIDTH, GRID_GAP } from '../utils/constants';

const useResponsiveGrid = (gridContainerRef, assetsLength, defaultAssetsLength, activeTab) => {
  const [assetsPerPage, setAssetsPerPage] = useState(9);
  const [gridMaxHeight, setGridMaxHeight] = useState(null);

  // Calculate assets per page based on container size
  const calculateAssetsPerPage = useCallback(() => {
    if (!gridContainerRef.current) return;

    const container = gridContainerRef.current;
    const containerPadding = 10; // 5px padding on each side
    const containerWidth = container.clientWidth - containerPadding; 
    const containerHeight = container.clientHeight - containerPadding;

    // Calculate how many items can fit in a row, accounting for gaps
    const columnsPerRow = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (GRID_ITEM_WIDTH + GRID_GAP)));
    
    // Calculate how many rows can fit, accounting for gaps
    // Be more aggressive with height calculation to show more rows
    const bufferSpace = 10; // Reduced buffer space
    const availableHeight = Math.max(GRID_ITEM_HEIGHT, containerHeight - bufferSpace);
    const rowsPerPage = Math.max(1, Math.floor((availableHeight + GRID_GAP) / (GRID_ITEM_HEIGHT + GRID_GAP)));

    // Calculate total items that can fit
    const itemsPerPage = columnsPerRow * rowsPerPage;
    
    // Calculate the exact height the grid should have to prevent overflow
    const exactGridHeight = rowsPerPage * (GRID_ITEM_HEIGHT + GRID_GAP) - GRID_GAP;
    
    // Update assets per page if it's different
    if (itemsPerPage !== assetsPerPage) {
      setAssetsPerPage(itemsPerPage);
      setGridMaxHeight(exactGridHeight);
    }
  }, [assetsPerPage, gridContainerRef]);

  // Recalculate on window resize, container size change, or tab switch
  useEffect(() => {
    const handleResize = () => {
      calculateAssetsPerPage();
    };

    window.addEventListener('resize', handleResize);
    
    // Initial calculation
    calculateAssetsPerPage();
    
    // Set up resize observer for container
    const resizeObserver = new ResizeObserver(calculateAssetsPerPage);
    if (gridContainerRef.current) {
      resizeObserver.observe(gridContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [calculateAssetsPerPage]);

  // Recalculate when switching tabs
  useEffect(() => {
    // Small delay to ensure DOM has updated after tab switch
    const timer = setTimeout(() => {
      calculateAssetsPerPage();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, calculateAssetsPerPage]);

  return {
    assetsPerPage,
    gridMaxHeight,
    calculateAssetsPerPage
  };
};

export default useResponsiveGrid; 