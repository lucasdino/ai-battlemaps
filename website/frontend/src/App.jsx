import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './components/Home.jsx';
import ViewAssets from './components/ViewAssets.jsx';
import ViewTerrains from './components/ViewTerrains.jsx';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/view-assets" element={<ViewAssets />} />
          <Route path="/view-terrains" element={<ViewTerrains />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
