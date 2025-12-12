// src/pages/PatientEditPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Button, Row, Col, Spinner, Alert } from "react-bootstrap";
import { getPatient, updatePatient } from "../api/patientsApi";

const PatientEditPage = () => {
  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();

  const patientId = routePatientId || localStorage.getItem("patientId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "",
    gestation_weeks: "",
    gravida: "",
    contact_number: "",
  });

  useEffect(() => {
    const load = async () => {
      if (!patientId) {
        navigate("/patients");
        return;
      }

      try {
        setError(null);
        setLoading(true);
        const res = await getPatient(patientId);
        const p = res.data || {};

        setForm({
          name: p.name || "",
          email: p.email || "",
          age: p.age || "",
          gestation_weeks: p.gestation_weeks || "",
          gravida: p.gravida || "",
          contact_number: p.contact_number || p.contact || "",
        });
      } catch (err) {
        console.error("Failed to load patient:", err);
        setError("Failed to load patient data. Try again or select another patient.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId, navigate]);

  const handleChange = (e) => {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // basic validation
    if (!form.name || !form.email) {
      setError("Please provide at least name and email.");
      return;
    }

    try {
      setSaving(true);
      await updatePatient(patientId, {
        name: form.name,
        email: form.email,
        age: form.age,
        gestation_weeks: form.gestation_weeks,
        gravida: form.gravida,
        contact_number: form.contact_number,
      });

      setSuccessMsg("Patient updated successfully.");
      // reflect change globally: update stored patient name/id if needed
      // optionally refresh dashboard — navigate back after a short delay
      setTimeout(() => {
        navigate(`/patients/${patientId}/dashboard`);
      }, 900);
    } catch (err) {
      console.error("Failed to update patient:", err);
      setError("Failed to update patient. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3">
      <h2 className="text-white mb-4">Edit Patient</h2>

      <Row>
        <Col md={8}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              {loading ? (
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span className="text-soft">Loading patient...</span>
                </div>
              ) : (
                <>
                  {error && <Alert variant="danger">{error}</Alert>}
                  {successMsg && <Alert variant="success">{successMsg}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Full name"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        type="email"
                        placeholder="Email address"
                      />
                    </Form.Group>

                    <Row className="g-2 mb-3">
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Age</Form.Label>
                          <Form.Control
                            name="age"
                            value={form.age}
                            onChange={handleChange}
                            type="number"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Gestation (weeks)</Form.Label>
                          <Form.Control
                            name="gestation_weeks"
                            value={form.gestation_weeks}
                            onChange={handleChange}
                            type="number"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Gravida</Form.Label>
                          <Form.Control
                            name="gravida"
                            value={form.gravida}
                            onChange={handleChange}
                            type="number"
                            min="0"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Contact Number</Form.Label>
                      <Form.Control
                        name="contact_number"
                        value={form.contact_number}
                        onChange={handleChange}
                        placeholder="Phone or mobile"
                      />
                    </Form.Group>

                    <div className="d-flex gap-2 justify-content-end">
                      <Button
                        variant="outline-secondary"
                        onClick={() => navigate(-1)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </div>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Notes</Card.Title>
              <p className="text-soft small">
                Editing patient info will update the record across the app
                (dashboard, history, analytics). This action requires a valid
                session; if you see authorization errors, re-login.
              </p>
              <div className="small text-soft">
                Tip: Make sure the email is unique for each account.
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PatientEditPage;
