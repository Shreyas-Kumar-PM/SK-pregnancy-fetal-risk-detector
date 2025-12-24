import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useParams, useLocation } from 'react-router-dom';

const Sidebar = ({ onClose }) => {
  const { patientId } = useParams();
  const location = useLocation();

  const pid = patientId || localStorage.getItem("patientId");

  const isActive = (path) => location.pathname === path;

  // 🌸 AI Care Coach event dispatcher
  const openCareCoach = () => {
    window.dispatchEvent(
      new CustomEvent("open-care-coach", {
        detail: { patientId: pid },
      })
    );

    // ✅ Close sidebar on mobile after click
    if (onClose) onClose();
  };

  // ✅ Close sidebar after navigation (mobile UX)
  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <div
      className="d-flex flex-column p-3 app-sidebar"
      style={{ minHeight: '100vh', width: 220 }}
    >
      {/* 🔥 MOBILE CLOSE BUTTON (hidden on desktop) */}
      <div className="d-md-none d-flex justify-content-end mb-2">
        <button
          className="btn btn-sm btn-outline-light"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <Nav className="flex-column gap-2">

        {/* Dashboard */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/dashboard`}
            className={isActive(`/patients/${pid}/dashboard`) ? 'active' : ''}
            onClick={handleNavClick}
          >
            Dashboard
          </Nav.Link>
        </Nav.Item>

        {/* History */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/history`}
            className={isActive(`/patients/${pid}/history`) ? 'active' : ''}
            onClick={handleNavClick}
          >
            History
          </Nav.Link>
        </Nav.Item>

        {/* Analytics */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/analytics`}
            className={isActive(`/patients/${pid}/analytics`) ? 'active' : ''}
            onClick={handleNavClick}
          >
            Analytics
          </Nav.Link>
        </Nav.Item>

        {/* Patients */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/patients"
            className={isActive("/patients") ? "active" : ""}
            onClick={handleNavClick}
          >
            Patients
          </Nav.Link>
        </Nav.Item>

        {/* Settings */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/settings"
            className={isActive("/settings") ? "active" : ""}
            onClick={handleNavClick}
          >
            Settings
          </Nav.Link>
        </Nav.Item>

        {/* Update Patient */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/update`}
            className={isActive(`/patients/${pid}/update`) ? 'active' : ''}
            onClick={handleNavClick}
          >
            Update Patient
          </Nav.Link>
        </Nav.Item>

        {/* Rewards */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/gamification"
            className={isActive('/gamification') ? 'active' : ''}
            onClick={handleNavClick}
          >
            Rewards & Streaks
          </Nav.Link>
        </Nav.Item>

        <hr className="my-3" />

        {/* Articles */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/articles"
            className={isActive('/articles') ? 'active' : ''}
            onClick={handleNavClick}
          >
            Pregnancy Articles
          </Nav.Link>
        </Nav.Item>

        {/* Relaxation */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/relaxation"
            className={isActive('/relaxation') ? 'active' : ''}
            onClick={handleNavClick}
          >
            Relaxation & Breathing
          </Nav.Link>
        </Nav.Item>

        <hr className="my-3" />

        {/* 🌸 AI Care Coach */}
        <Nav.Item>
          <Nav.Link
            onClick={openCareCoach}
            style={{ cursor: "pointer" }}
            className="ai-care-coach-link"
          >
            🌸 AI Care Coach
          </Nav.Link>
        </Nav.Item>

      </Nav>
    </div>
  );
};

export default Sidebar;
