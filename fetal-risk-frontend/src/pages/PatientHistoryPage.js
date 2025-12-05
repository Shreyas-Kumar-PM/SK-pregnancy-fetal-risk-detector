// src/pages/PatientHistoryPage.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Row, Col } from 'react-bootstrap';
import { getReadings } from '../api/readingsApi';
import { getRiskHistory } from '../api/riskApi';

const PatientHistoryPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [readings, setReadings] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ do *all* the conditional stuff inside the effect
    const load = async () => {
      if (!patientId || patientId === 'undefined') {
        const stored = localStorage.getItem('patientId');
        if (stored) {
          navigate(`/patients/${stored}/history`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const [readingsRes, riskRes] = await Promise.all([
          getReadings(patientId),
          getRiskHistory(patientId).catch(() => ({ data: [] })), // tolerate missing
        ]);

        setReadings(Array.isArray(readingsRes.data) ? readingsRes.data : []);
        setRiskHistory(Array.isArray(riskRes.data) ? riskRes.data : []);
      } catch (err) {
        console.error('Error loading history:', err);
        const status = err.response?.status;
        if (status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('patientId');
          navigate('/login', { replace: true });
        } else if (status === 404) {
          setError('No history found for this patient.');
        } else {
          setError('Failed to load history from server.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, navigate]);

  return (
    <>
      {error && (
        <div className="alert alert-danger py-2 mb-3">
          {error}
        </div>
      )}

      <Row>
        <Col md={8}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Reading History</Card.Title>
              <div className="small text-soft mb-2">
                Latest readings first
              </div>

              {loading && (
                <div className="text-soft">Loading readings...</div>
              )}

              {!loading && (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  <Table striped hover size="sm" variant="dark">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>FHR</th>
                        <th>Maternal HR</th>
                        <th>BP</th>
                        <th>SpO₂</th>
                        <th>Temp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-soft">
                            No readings recorded yet.
                          </td>
                        </tr>
                      )}
                      {readings.map((r) => (
                        <tr key={r.id}>
                          <td>{new Date(r.recorded_at).toLocaleString()}</td>
                          <td>{r.fetal_hr} bpm</td>
                          <td>{r.maternal_hr} bpm</td>
                          <td>{r.systolic_bp}/{r.diastolic_bp}</td>
                          <td>{r.spo2}%</td>
                          <td>{r.temperature} °C</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Risk History</Card.Title>
              <div className="small text-soft mb-2">
                Recent risk evaluations
              </div>

              {loading && (
                <div className="text-soft">Loading risk history...</div>
              )}

              {!loading && riskHistory.length === 0 && (
                <div className="text-soft">
                  No risk history available yet.
                </div>
              )}

              {!loading && riskHistory.length > 0 && (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {riskHistory.map((h) => (
                    <div key={h.id} className="mb-2">
                      <div>
                        <strong>{h.risk_level?.toUpperCase()}</strong>
                        {' – '}
                        Score: {h.risk_score?.toFixed(2)}
                      </div>
                      <div className="small text-soft">
                        {h.reason}
                        <br />
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                      <hr style={{ borderColor: '#2B2E31' }} />
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PatientHistoryPage;
