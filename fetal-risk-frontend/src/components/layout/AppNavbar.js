import React from 'react';
import { Navbar, Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AppNavbar = ({ auth, setAuth }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear stored auth
    localStorage.removeItem('token');
    localStorage.removeItem('patientId');

    // Reset frontend auth state
    setAuth({ token: null, patientId: null });

    // Redirect to login
    navigate('/login', { replace: true });
  };

  return (
    <Navbar expand="lg" variant="dark" className="shadow-sm px-3" style={{ background: '#0D0D0F' }}>
      <Container fluid>
        <Navbar.Brand style={{ fontWeight: 600, color: '#E6E6E8' }}>
          SKFetal Risk Detector
        </Navbar.Brand>

        {/* Show logout only when logged in */}
        {auth?.token && (
          <Button variant="outline-light" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </Container>
    </Navbar>
  );
};

export default AppNavbar;
