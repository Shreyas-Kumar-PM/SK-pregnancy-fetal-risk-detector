import React from 'react';
import { Navbar, Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AppNavbar = ({ auth, setAuth, onMenuClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('patientId');
    setAuth({ token: null, patientId: null });
    navigate('/login', { replace: true });
  };

  return (
    <Navbar
      expand="lg"
      variant="dark"
      className="shadow-sm px-3"
      style={{ background: '#0D0D0F', height: 56 }}
    >
      <Container fluid className="d-flex justify-content-between align-items-center">

        {/* ☰ MOBILE MENU BUTTON */}
        {auth?.token && (
          <button
            className="btn btn-sm btn-outline-light d-md-none me-2"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}

        {/* BRAND */}
        <Navbar.Brand
          style={{ fontWeight: 600, color: '#E6E6E8' }}
          className="me-auto"
        >
          SKFetal Risk Detector
        </Navbar.Brand>

        {/* LOGOUT */}
        {auth?.token && (
          <Button
            variant="outline-light"
            size="sm"
            onClick={handleLogout}
          >
            Logout
          </Button>
        )}

      </Container>
    </Navbar>
  );
};

export default AppNavbar;
