import React from 'react';
import { Button } from '../common';
import styles from '../../styles/ViewAssets';

const Pagination = ({ currentPage, totalPages, onPageChange, disabled = false }) => {
  if (totalPages <= 1) return null;

  return (
    <div style={styles.paginationControls}>
      <Button 
        variant="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
      >
        &lt;
      </Button>
      <span style={styles.pageIndicator}>
        {currentPage} / {totalPages}
      </span>
      <Button 
        variant="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
      >
        &gt;
      </Button>
    </div>
  );
};

export default Pagination; 