import React, { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/authApi';

const RegisterPage = ({ setAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    age: '',
    gestation_weeks: '',
    gravida: '',
    contact_number: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerUser({
        ...form,
        age: Number(form.age),
        gestation_weeks: Number(form.gestation_weeks),
        gravida: Number(form.gravida),
      });

      const { token, patient_id } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('patientId', patient_id);

      setAuth({ token, patientId: patient_id });

      navigate(`/patients/${patient_id}/dashboard`);
    } catch (err) {
      setError(
        err.response?.data?.errors?.join(', ') ||
          err.response?.data?.error ||
          'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#0E0E10' }}>
      <Card style={{ width: 420 }}>
        <Card.Body>
          <Card.Title className="mb-3">Create Account</Card.Title>
          {error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-2">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control
                type="password"
                name="password_confirmation"
                value={form.password_confirmation}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Age</Form.Label>
              <Form.Control
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Gestation Weeks</Form.Label>
              <Form.Control
                type="number"
                name="gestation_weeks"
                value={form.gestation_weeks}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label>Gravida</Form.Label>
              <Form.Control
                type="number"
                name="gravida"
                value={form.gravida}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                type="text"
                name="contact_number"
                value={form.contact_number}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading} className="w-100">
              {loading ? 'Creating account...' : 'Register'}
            </Button>

            <div className="small text-soft mt-3 text-center">
              Already have an account?{' '}
              <span
                style={{ color: '#C49A6C', cursor: 'pointer' }}
                onClick={() => navigate('/login')}
              >
                Log in
              </span>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default RegisterPage;
