import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // We'll create this for basic styling

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-title">
        <span className="title-text">Dungeon Coder</span>
      </Link>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/view-assets">3D Models</Link>
      </div>
    </nav>
  );
};

export default Navbar; 