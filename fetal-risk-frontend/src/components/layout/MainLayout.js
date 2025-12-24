import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import AppNavbar from './AppNavbar';
import Sidebar from './Sidebar';

const MainLayout = ({ children, auth, setAuth }) => {
  const [showSidebar, setShowSidebar] = useState(false); // ✅ NEW

  return (
    <div className="vh-100 d-flex flex-column app-shell">
      {/* Navbar (already mobile-friendly) */}
      <AppNavbar
        auth={auth}
        setAuth={setAuth}
        onMenuClick={() => setShowSidebar(true)} // ✅ NEW (safe even if unused)
      />

      <Container fluid className="flex-grow-1 app-main">
        <Row className="h-100">

          {/* Sidebar */}
          <Col
            xs="auto"
            className={`p-0 sidebar-col ${showSidebar ? 'show' : ''}`}
          >
            <Sidebar onClose={() => setShowSidebar(false)} /> {/* ✅ NEW */}
          </Col>

          {/* Main content */}
          <Col className="p-4 main-content-col">
            {children}
          </Col>

        </Row>
      </Container>

      {/* Mobile overlay */}
      {showSidebar && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
};

export default MainLayout;
