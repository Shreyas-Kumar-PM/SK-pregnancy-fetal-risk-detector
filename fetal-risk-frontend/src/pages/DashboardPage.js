// src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button } from 'react-bootstrap';
import { getReadings } from '../api/readingsApi';
import { getCurrentRisk, downloadRiskReport } from '../api/riskApi';
import { simulateReading } from '../api/simulationApi';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import LiveVitalsCard from '../components/dashboard/LiveVitalsCard';
import PatientInfoCard from '../components/dashboard/PatientInfoCard';
import RiskStatusCard from '../components/dashboard/RiskStatusCard';
import VitalsChart from '../components/dashboard/VitalsChart';
import RiskAlertBanner from '../components/RiskAlertBanner';

const DashboardPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  // Resolve patientId (route param or localStorage)
  const resolvedPatientId =
    patientId && patientId !== 'undefined'
      ? patientId
      : localStorage.getItem('patientId');

  const [readings, setReadings] = useState([]);
  const [risk, setRisk] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  
  const fetchData = async (id) => {
    try {
      setError(null);
      const [readingsRes, riskRes] = await Promise.all([
        getReadings(id),
        getCurrentRisk(id),
      ]);
      setReadings(readingsRes.data);
      setRisk(riskRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const status = err.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('patientId');
        navigate('/login', { replace: true });
      } else if (status === 404) {
        setError('No patient data found for this account.');
      } else {
        setError('Failed to load data from server.');
      }
    }
  };

  const triggerSimulation = async (id, mode) => {
    try {
      const res = await simulateReading(id, mode);
      const { reading, risk_evaluation } = res.data;

      setReadings((prev) => [reading, ...prev].slice(0, 100));
      setRisk(risk_evaluation);

      if (['warning', 'critical'].includes(risk_evaluation.risk_level)) {
        setAlerts((prev) => [
          {
            timestamp: reading.recorded_at,
            level: risk_evaluation.risk_level,
            message: risk_evaluation.reason,
          },
          ...prev,
        ]);
      }
    } catch (err) {
      console.error('Error simulating reading:', err);
      const status = err.response?.status;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('patientId');
        navigate('/login', { replace: true });
      } else {
        setError('Failed to generate sample reading.');
      }
    }
  };

  useEffect(() => {
    if (!resolvedPatientId) {
      navigate('/login', { replace: true });
      return;
    }

    fetchData(resolvedPatientId);

    const interval = setInterval(() => {
      // normal mode auto-simulation every 15s
      triggerSimulation(resolvedPatientId);
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPatientId, navigate]);

  const handleNormalSimulation = () => {
    if (!resolvedPatientId) return;
    triggerSimulation(resolvedPatientId);
  };

  const handleCriticalSimulation = () => {
    if (!resolvedPatientId) return;
    triggerSimulation(resolvedPatientId, 'critical');
  };

  const handleDownloadReport = async () => {
    if (!resolvedPatientId) return;
    try {
      const res = await downloadRiskReport(resolvedPatientId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `risk-report-patient-${resolvedPatientId}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert-danger py-2 mb-3">
          {error}
        </div>
      )}

      {/* 🔴 Real-time alert banner (warning / critical) */}
      <RiskAlertBanner patientId={resolvedPatientId} />

      <Row className="mb-3">
        <Col md={3}>
          <PatientInfoCard patientId={resolvedPatientId} />
        </Col>
        <Col md={6}>
          <LiveVitalsCard readings={readings} />
        </Col>
        <Col md={3}>
          <RiskStatusCard risk={risk} />
        </Col>
      </Row>

      <Row className="mb-3">
        <Col className="d-flex justify-content-between align-items-center gap-2">
          <Button
            variant="outline-info"
            size="sm"
            onClick={handleDownloadReport}
          >
            ⬇ Download Risk Report (PDF)
          </Button>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-light" onClick={handleNormalSimulation}>
              Generate Normal Sample Reading
            </Button>
            <Button variant="danger" onClick={handleCriticalSimulation}>
              Generate Critical Demo Alert
            </Button>
          </div>
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <VitalsChart readings={readings} />
        </Col>
        <Col md={4}>
          <AlertsPanel alerts={alerts} />
        </Col>
      </Row>
    </>
  );
};

export default DashboardPage;
