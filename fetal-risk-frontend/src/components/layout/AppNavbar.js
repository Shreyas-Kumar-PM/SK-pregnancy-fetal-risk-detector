import React from "react";
import { Navbar, Container, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const AppNavbar = ({ auth, setAuth, onMenuClick }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear stored auth
    localStorage.removeItem("token");
    localStorage.removeItem("patientId");

    // Reset frontend auth state
    setAuth({ token: null, patientId: null });

    // Redirect to login
    navigate("/login", { replace: true });
  };

  return (
    <Navbar
      expand="lg"
      variant="dark"
      className="shadow-sm px-3 d-flex align-items-center"
      style={{ background: "#0D0D0F" }}
    >
      <Container fluid className="d-flex align-items-center justify-content-between">
        {/* LEFT: Mobile menu + Brand */}
        <div className="d-flex align-items-center gap-2">
          {/* ☰ MOBILE SIDEBAR BUTTON */}
          {auth?.token && (
            <Button
              variant="outline-light"
              size="sm"
              className="d-md-none"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              ☰
            </Button>
          )}

          <Navbar.Brand
            style={{ fontWeight: 600, color: "#E6E6E8", cursor: "pointer" }}
            onClick={() => navigate("/patients")}
          >
            SKFetal Risk Detector
          </Navbar.Brand>
        </div>

        {/* RIGHT: Logout */}
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
