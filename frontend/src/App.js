import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Unregistered from './components/Signup';
import Registered from './components/Navbar';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/unregistered" element={<Unregistered />} />
        <Route path="/registered" element={<Registered />} />
      </Routes>
    </Router>
  );
}

// Add this line to fix the error
export default App;