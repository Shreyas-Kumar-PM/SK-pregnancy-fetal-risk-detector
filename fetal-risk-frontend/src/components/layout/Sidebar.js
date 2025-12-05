import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useParams, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { patientId } = useParams();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className="d-flex flex-column p-3 app-sidebar"
      style={{ minHeight: '100vh', width: 220 }}
    >
      <Nav className="flex-column gap-2">
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${patientId}/dashboard`}
            className={isActive(`/patients/${patientId}/dashboard`) ? 'active' : ''}
          >
            Dashboard
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link
            as={Link}
            to={`/patients/${patientId}/history`}
            className={isActive(`/patients/${patientId}/history`) ? 'active' : ''}
          >
            History
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
      </Nav>
    </div>
  );
};

export default Sidebar;
