import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import AppNavbar from './AppNavbar';
import Sidebar from './Sidebar';

const MainLayout = ({ children, auth, setAuth }) => {
  return (
    <div className="vh-100 d-flex flex-column app-shell">
      <AppNavbar auth={auth} setAuth={setAuth} />

      <Container fluid className="flex-grow-1 app-main">
        <Row className="h-100">
          <Col xs="auto" className="p-0">
            <Sidebar />
          </Col>
          <Col className="p-4">
            {children}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default MainLayout;
