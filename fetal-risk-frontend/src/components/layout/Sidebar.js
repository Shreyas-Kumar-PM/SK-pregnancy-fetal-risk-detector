import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useParams, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { patientId } = useParams();
  const location = useLocation();

  const pid = patientId || localStorage.getItem("patientId");

  const isActive = (path) => location.pathname === path;

  // 🔥 NEW — open AI Care Coach modal
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

        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/dashboard`}
            className={isActive(`/patients/${pid}/dashboard`) ? 'active' : ''}
          >
            Dashboard
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/history`}
            className={isActive(`/patients/${pid}/history`) ? 'active' : ''}
          >
            History
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${pid}/analytics`}
            className={isActive(`/patients/${pid}/analytics`) ? 'active' : ''}
          >
            Analytics
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/patients"
            className={isActive('/patients') ? 'active' : ''}
          >
            Patients
          </Nav.Link>
        </Nav.Item>

        <Nav.Item>
          <Nav.Link
            as={Link}
            to="/settings"
            className={isActive('/settings') ? 'active' : ''}
          >
            Settings
          </Nav.Link>
        </Nav.Item>

        {/* 🌸 NEW ITEM: AI Care Coach */}
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
