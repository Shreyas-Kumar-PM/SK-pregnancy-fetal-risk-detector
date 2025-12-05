import React, { useState } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/authApi';

const LoginPage = ({ setAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
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
      const res = await loginUser(form.email, form.password);
      const { token, patient_id } = res.data;

      if (!patient_id) {
        setError('No patient profile found for this user.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('patientId', patient_id);

      setAuth({ token, patientId: patient_id });

      navigate(`/patients/${patient_id}/dashboard`);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ background: '#0E0E10' }}>
      <Card style={{ width: 380 }}>
        <Card.Body>
          <Card.Title className="mb-3">Welcome back</Card.Title>
          {error && (
            <div className="alert alert-danger py-2">{error}</div>
          )}
          <Form onSubmit={handleSubmit}>
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

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Button type="submit" variant="primary" disabled={loading} className="w-100">
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="small text-soft mt-3 text-center">
              Don&apos;t have an account?{' '}
              <span
                style={{ color: '#C49A6C', cursor: 'pointer' }}
                onClick={() => navigate('/register')}
              >
                Register
              </span>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default LoginPage;
