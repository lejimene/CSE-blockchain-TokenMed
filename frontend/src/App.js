import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AccessPage from './pages/Sign&Signup';
import PatientPage from './pages/PatientPage';
import DoctorPage from './pages/DoctorPage';
import AdminPage from './pages/admin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AccessPage />} />
        <Route path="/patient" element={<PatientPage />} />
        <Route path="/doctor" element={<DoctorPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

// Add this line to fix the error
export default App;