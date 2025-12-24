import React from "react";
import { Nav } from "react-bootstrap";
import { Link, useParams, useLocation } from "react-router-dom";

const Sidebar = ({ onClose }) => {
  const { patientId } = useParams();
  const location = useLocation();

  const pid = patientId || localStorage.getItem("patientId");

  const isActive = (path) => location.pathname === path;

  // 🌸 AI Care Coach
  const openCareCoach = () => {
    window.dispatchEvent(
      new CustomEvent("open-care-coach", {
        detail: { patientId: pid },
      })
    );

    if (onClose) onClose();
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className="app-sidebar d-flex flex-column p-3">
      {/* 📱 Mobile close button */}
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
        <Nav.Link
          as={Link}
          to={`/patients/${pid}/dashboard`}
          className={isActive(`/patients/${pid}/dashboard`) ? "active" : ""}
          onClick={handleNavClick}
        >
          Dashboard
        </Nav.Link>

        <Nav.Link
          as={Link}
          to={`/patients/${pid}/history`}
          className={isActive(`/patients/${pid}/history`) ? "active" : ""}
          onClick={handleNavClick}
        >
          History
        </Nav.Link>

        <Nav.Link
          as={Link}
          to={`/patients/${pid}/analytics`}
          className={isActive(`/patients/${pid}/analytics`) ? "active" : ""}
          onClick={handleNavClick}
        >
          Analytics
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/patients"
          className={isActive("/patients") ? "active" : ""}
          onClick={handleNavClick}
        >
          Patients
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/settings"
          className={isActive("/settings") ? "active" : ""}
          onClick={handleNavClick}
        >
          Settings
        </Nav.Link>

        <Nav.Link
          as={Link}
          to={`/patients/${pid}/update`}
          className={isActive(`/patients/${pid}/update`) ? "active" : ""}
          onClick={handleNavClick}
        >
          Update Patient
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/gamification"
          className={isActive("/gamification") ? "active" : ""}
          onClick={handleNavClick}
        >
          Rewards & Streaks
        </Nav.Link>

        <hr className="my-3" />

        <Nav.Link
          as={Link}
          to="/articles"
          className={isActive("/articles") ? "active" : ""}
          onClick={handleNavClick}
        >
          Pregnancy Articles
        </Nav.Link>

        <Nav.Link
          as={Link}
          to="/relaxation"
          className={isActive("/relaxation") ? "active" : ""}
          onClick={handleNavClick}
        >
          Relaxation & Breathing
        </Nav.Link>

        <hr className="my-3" />

        <Nav.Link
          onClick={openCareCoach}
          className="ai-care-coach-link"
          style={{ cursor: "pointer" }}
        >
          🌸 AI Care Coach
        </Nav.Link>
      </Nav>
    </aside>
  );
};

export default Sidebar;
