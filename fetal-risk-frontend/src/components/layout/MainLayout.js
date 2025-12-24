// src/layouts/MainLayout.js
import React, { useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import AppNavbar from "./AppNavbar";
import Sidebar from "./Sidebar";

const MainLayout = ({ children, auth, setAuth }) => {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="vh-100 d-flex flex-column app-shell">
      {/* NAVBAR */}
      <AppNavbar
        auth={auth}
        setAuth={setAuth}
        onMenuClick={() => setShowSidebar(true)}
      />

      <Container fluid className="flex-grow-1 app-main">
        <Row className="h-100 position-relative">

          {/* ✅ SIDEBAR (NOT Bootstrap Col) */}
          <div className={`sidebar-col ${showSidebar ? "show" : ""}`}>
            <Sidebar onClose={() => setShowSidebar(false)} />
          </div>

          {/* MAIN CONTENT */}
          <Col className="p-4 main-content-col">{children}</Col>
        </Row>
      </Container>

      {/* MOBILE OVERLAY */}
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
