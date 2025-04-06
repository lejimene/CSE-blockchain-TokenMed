import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AccessPage from './pages/Sign&Signup';
import PatientPage from './pages/PatientPage';
import DoctorPage from './pages/DoctorPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AccessPage />} />
        <Route path="/patient" element={<PatientPage />} />
        <Route path="/doctor" element={<DoctorPage />} />
      </Routes>
    </Router>
  );
}

// Add this line to fix the error
export default App;