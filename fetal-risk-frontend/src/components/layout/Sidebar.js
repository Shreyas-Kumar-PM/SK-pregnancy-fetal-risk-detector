import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useParams, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { patientId } = useParams();
  const location = useLocation();

  const pid = patientId || localStorage.getItem("patientId");

  const isActive = (path) => location.pathname === path;

  // 🔥 AI Care Coach event dispatcher
  const openCareCoach = () => {
    window.dispatchEvent(
      new CustomEvent("open-care-coach", {
        detail: { patientId: pid },
      })
    );
  };

  return (
    <div
      className="d-flex flex-column p-3 app-sidebar"
      style={{ minHeight: '100vh', width: 220 }}
    >
      <Nav className="flex-column gap-2">

        {/* Dashboard */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/dashboard`}
            className={isActive(`/patients/${pid}/dashboard`) ? 'active' : ''}
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
          >
            Settings
          </Nav.Link>
        </Nav.Item>

        {/* Update patient */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/update`}
            className={isActive(`/patients/${pid}/update`) ? 'active' : ''}
          >
            Update Patient
          </Nav.Link>
        </Nav.Item>

        {/* Gamification */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/gamification"
            className={isActive('/gamification') ? 'active' : ''}
          >
            Rewards & Streaks
          </Nav.Link>
        </Nav.Item>

        <hr className="my-3" />

        {/* Pregnancy Articles */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/articles"
            className={isActive('/articles') ? 'active' : ''}
          >
            Pregnancy Articles
          </Nav.Link>
        </Nav.Item>

        {/* 🧘 NEW: Relaxation Module */}
        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/relaxation"
            className={isActive('/relaxation') ? 'active' : ''}
          >
            Relaxation & Breathing
          </Nav.Link>
        </Nav.Item>

        <hr className="my-3" />

        {/* AI Care Coach */}
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
