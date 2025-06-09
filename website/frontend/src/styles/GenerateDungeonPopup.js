const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  
  modal: {
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    width: '90vw',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid #444',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #444',
    backgroundColor: '#333',
  },
  
  title: {
    color: '#fff',
    margin: 0,
    fontSize: '20px',
    fontWeight: 'bold',
  },
  
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: '400px',
  },
  
  leftPanel: {
    width: '300px',
    padding: '20px',
    borderRight: '1px solid #444',
    overflowY: 'auto',
    backgroundColor: '#2a2a2a',
  },
  
  rightPanel: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#1e1e1e',
  },
  
  sectionTitle: {
    color: '#fff',
    fontSize: '16px',
    marginBottom: '15px',
    fontWeight: 'bold',
  },
  
  paramGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '20px',
  },
  
  label: {
    color: '#fff',
    fontSize: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  
  slider: {
    width: '100%',
    height: '6px',
    backgroundColor: '#444',
    borderRadius: '3px',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  },
  
  select: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  
  gridSizeControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  numberInput: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    padding: '8px',
    fontSize: '14px',
    outline: 'none',
    width: '80px',
  },
  
  generateButton: {
    backgroundColor: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
  },
  
  generateButtonDisabled: {
    backgroundColor: '#555',
    cursor: 'not-allowed',
  },
  
  canvasContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    backgroundColor: '#000',
    borderRadius: '8px',
    padding: '10px',
    border: '1px solid #444',
  },
  
  canvas: {
    maxWidth: '100%',
    maxHeight: '300px',
    border: '1px solid #555',
  },
  
  legend: {
    backgroundColor: '#333',
    borderRadius: '8px',
    padding: '15px',
    border: '1px solid #555',
  },
  
  legendTitle: {
    color: '#fff',
    fontSize: '14px',
    marginBottom: '10px',
    fontWeight: 'bold',
  },
  
  legendItems: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
    border: '1px solid #666',
  },
  
  // Design section styles
  designSection: {
    borderTop: '2px solid #444',
    backgroundColor: '#1e1e1e',
    padding: '15px',
  },
  
  designTitle: {
    color: '#fff',
    fontSize: '18px',
    marginBottom: '20px',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  designControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  
  inputLabel: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  
  nameInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    border: '2px solid #555',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  
  promptInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    border: '2px solid #555',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  
  designButton: {
    backgroundColor: '#FF6B35',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
    maxWidth: '250px',
    margin: '8px auto 0',
    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
  },
  
  designButtonDisabled: {
    backgroundColor: '#555',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  
  error: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#dc3545',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
  },
  
  success: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: '6px',
    fontSize: '14px',
    textAlign: 'center',
  },
};

export default styles; 