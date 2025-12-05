// src/pages/SettingsPage.js
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form } from 'react-bootstrap';
import { fetchMe } from '../api/authApi';
import { getPatient } from '../api/patientsApi';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);

  const patientId = localStorage.getItem('patientId');

  const loadData = async () => {
    try {
      setError(null);
      const [meRes, patientRes] = await Promise.all([
        fetchMe(),
        patientId ? getPatient(patientId) : Promise.resolve({ data: null }),
      ]);

      setUser(meRes.data);
      setPatient(patientRes.data);
    } catch (err) {
      console.error('Error loading settings:', err);
      const status = err.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('patientId');
        navigate('/login', { replace: true });
      } else {
        setError('Failed to load profile information.');
      }
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {error && (
        <div className="alert alert-danger py-2 mb-3">
          {error}
        </div>
      )}

      <Row>
        {/* Account card */}
        <Col md={6}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Account</Card.Title>
              {!user && (
                <div className="text-soft">Loading account...</div>
              )}
              {user && (
                <>
                  <div className="fw-semibold mt-2">{user.name}</div>
                  <div className="small text-soft mt-1">
                    Email: {user.email}
                    <br />
                    User ID: {user.id}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Pregnancy profile card */}
        <Col md={6}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Pregnancy Profile</Card.Title>
              {!patient && (
                <div className="text-soft">
                  No patient profile found for this account yet.
                </div>
              )}
              {patient && (
                <div className="small text-soft mt-2">
                  <div><strong>{patient.name}</strong></div>
                  Age: {patient.age} yrs
                  <br />
                  Gestation: {patient.gestation_weeks} weeks
                  <br />
                  Gravida: {patient.gravida}
                  <br />
                  Contact: {patient.contact_number}
                  <br />
                  Email: {patient.email}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Notification Settings card */}
        <Col md={6}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Notification Settings</Card.Title>

              <div className="text-soft mb-3">
                Customize how you'd like to receive alerts for fetal and maternal risks.
              </div>

              {/* Email Alerts */}
              <div className="p-3 mb-3 rounded" style={{ backgroundColor: '#1c1e22' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold text-white">Email Alerts</div>
                    <div className="small text-soft">
                      Receive notifications for <strong>WARNING</strong> &amp; <strong>CRITICAL</strong> risk levels.
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    id="email-alerts"
                    defaultChecked
                  />
                </div>
              </div>

              {/* SMS Alerts */}
              <div className="p-3 mb-3 rounded" style={{ backgroundColor: '#1c1e22' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold text-white">SMS Alerts</div>
                    <div className="small text-soft">
                      Get urgent alerts via SMS for <strong>CRITICAL</strong> risk events.
                    </div>
                  </div>
                  <Form.Check
                    type="switch"
                    id="sms-alerts"
                  />
                </div>
              </div>

              {/* Quiet Hours */}
              <div className="p-3 rounded" style={{ backgroundColor: '#1c1e22' }}>
                <div className="fw-semibold text-white">Quiet Hours</div>
                <div className="small text-soft mb-2">
                  Alerts are muted during these hours, except for <strong>CRITICAL</strong> events.
                </div>

                <Row>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className="small text-soft">From</Form.Label>
                      <Form.Control type="time" defaultValue="22:00" />
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className="small text-soft">To</Form.Label>
                      <Form.Control type="time" defaultValue="06:00" />
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default SettingsPage;
