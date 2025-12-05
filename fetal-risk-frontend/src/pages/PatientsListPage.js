import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button } from 'react-bootstrap';
import { getPatients } from '../api/patientsApi';

const PatientsListPage = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setError(null);
      const res = await getPatients();
      setPatients(res.data || []);
    } catch (err) {
      console.error('Error loading patients:', err);
      const status = err.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('patientId');
        navigate('/login', { replace: true });
      } else {
        setError('Failed to load patients.');
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDashboard = (id) => {
    localStorage.setItem('patientId', id);
    navigate(`/patients/${id}/dashboard`);
  };

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>My Patients</Card.Title>
        <div className="small text-soft mb-2">
          Each account currently manages one patient profile.
        </div>

        {error && (
          <div className="alert alert-danger py-2 mb-3">
            {error}
          </div>
        )}

        <Table striped hover size="sm" variant="dark">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Gestation</th>
              <th>Gravida</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td colSpan={6} className="text-soft">
                  No patients found for this account.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.age}</td>
                <td>{p.gestation_weeks} weeks</td>
                <td>{p.gravida}</td>
                <td>{p.contact_number}</td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenDashboard(p.id)}
                  >
                    Open Dashboard
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
};

export default PatientsListPage;
