// src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { getReadings } from "../api/readingsApi";
import { getCurrentRisk, downloadRiskReport } from "../api/riskApi";
import { simulateReading } from "../api/simulationApi";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import LiveVitalsCard from "../components/dashboard/LiveVitalsCard";
import PatientInfoCard from "../components/dashboard/PatientInfoCard";
import RiskStatusCard from "../components/dashboard/RiskStatusCard";
import VitalsChart from "../components/dashboard/VitalsChart";
import RiskAlertBanner from "../components/RiskAlertBanner";
import ExplainRiskModal from "../components/ExplainRiskModal";

const DashboardPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  // Resolve patientId
  const resolvedPatientId =
    patientId && patientId !== "undefined"
      ? patientId
      : localStorage.getItem("patientId");

  const [readings, setReadings] = useState([]);
  const [risk, setRisk] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(true);

  // -------------------------------------------------------
  // FIX: Wrap fetchData in useCallback to avoid stale refs
  // -------------------------------------------------------
  const fetchData = useCallback(
    async (id) => {
      try {
        setError(null);
        setLoadingRisk(true);

        const [readingsRes, riskRes] = await Promise.all([
          getReadings(id),
          getCurrentRisk(id),
        ]);

        setReadings(readingsRes.data);
        setRisk(riskRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const status = err.response?.status;
        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("patientId");
          navigate("/login", { replace: true });
        } else if (status === 404) {
          setError("No patient data found for this account.");
        } else {
          setError("Failed to load data from server.");
        }
      } finally {
        setLoadingRisk(false);
      }
    },
    [navigate]
  );

  // -------------------------------------------------------
  // FIX: Wrap triggerSimulation in useCallback
  // -------------------------------------------------------
  const triggerSimulation = useCallback(
    async (id, mode) => {
      try {
        const simRes = mode
          ? await simulateReading(id, mode)
          : await simulateReading(id);

        const { reading } = simRes.data;

        setReadings((prev) => [reading, ...prev].slice(0, 100));

        const riskRes = await getCurrentRisk(id);
        const latestRisk = riskRes.data;
        setRisk(latestRisk);

        if (
          latestRisk &&
          ["warning", "critical"].includes(latestRisk.risk_level)
        ) {
          setAlerts((prev) => [
            {
              timestamp: reading.recorded_at,
              level: latestRisk.risk_level,
              message: latestRisk.reason,
            },
            ...prev,
          ]);
        }
      } catch (err) {
        console.error("Error simulating reading:", err);
        const status = err.response?.status;
        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("patientId");
          navigate("/login", { replace: true });
        } else {
          setError("Failed to generate sample reading.");
        }
      }
    },
    [navigate]
  );

  // -------------------------------------------------------
  // FIXED useEffect dependencies — NO MORE WARNINGS
  // -------------------------------------------------------
  useEffect(() => {
    if (!resolvedPatientId) {
      navigate("/login", { replace: true });
      return;
    }

    fetchData(resolvedPatientId);

    const interval = setInterval(() => {
      triggerSimulation(resolvedPatientId);
    }, 15000);

    return () => clearInterval(interval);
  }, [resolvedPatientId, navigate, fetchData, triggerSimulation]);

  const handleNormalSimulation = () => {
    if (resolvedPatientId) triggerSimulation(resolvedPatientId);
  };

  const handleCriticalSimulation = () => {
    if (resolvedPatientId) triggerSimulation(resolvedPatientId, "critical");
  };

  const handleDownloadReport = async () => {
    if (!resolvedPatientId) return;
    try {
      const res = await downloadRiskReport(resolvedPatientId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `risk-report-patient-${resolvedPatientId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report:", err);
      alert("Failed to download report. Please try again.");
    }
  };

  return (
    <div className="dashboard-bg">
      <div className="dashboard-bg-inner">
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

        <div className="welcome-banner mb-4">
          <h4 className="welcome-title">👶 Maternal–Fetal Health Monitoring</h4>
          <p className="welcome-text">
            This dashboard continuously monitors maternal and fetal vitals,
            combining medical heuristics with advanced machine-learning models
            to provide early detection of potential risks and support a safe,
            healthy pregnancy journey.
          </p>
        </div>

        <RiskAlertBanner risk={risk} loading={loadingRisk} />

        <Row className="mb-3">
          <Col md={3}>
            <PatientInfoCard patientId={resolvedPatientId} />
          </Col>
          <Col md={6}>
            <LiveVitalsCard readings={readings} />
          </Col>
          <Col md={3}>
            <RiskStatusCard risk={risk} loading={loadingRisk} />
          </Col>
        </Row>

        <Row className="mb-3">
          <Col className="d-flex justify-content-between align-items-center gap-2">
            <Button variant="outline-info" size="sm" onClick={handleDownloadReport}>
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

        <ExplainRiskModal />
      </div>
    </div>
  );
};

export default DashboardPage;
