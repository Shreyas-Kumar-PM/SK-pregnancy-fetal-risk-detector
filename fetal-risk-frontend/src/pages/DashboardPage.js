// src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { getReadings } from "../api/readingsApi";
import {
  getCurrentRisk,
  downloadRiskReport,
  getRiskForecast,        // ⬅ NEW
} from "../api/riskApi";
import { simulateReading } from "../api/simulationApi";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import LiveVitalsCard from "../components/dashboard/LiveVitalsCard";
import PatientInfoCard from "../components/dashboard/PatientInfoCard";
import RiskStatusCard from "../components/dashboard/RiskStatusCard";
import VitalsChart from "../components/dashboard/VitalsChart";
import RiskAlertBanner from "../components/RiskAlertBanner";
import ExplainRiskModal from "../components/ExplainRiskModal";
import AiHealthSearchModal from "../components/AiHealthSearchModal";
import RiskForecastCard from "../components/dashboard/RiskForecastCard"; // ⬅ NEW
import CareCoachModal from "../components/CareCoachModal"; // ⬅ NEW


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
  const [riskForecast, setRiskForecast] = useState(null); // ⬅ NEW
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(true);

  // -------------------------------------------------------
  // fetchData wrapped in useCallback
  // -------------------------------------------------------
  const fetchData = useCallback(
    async (id) => {
      try {
        setError(null);
        setLoadingRisk(true);

        const [readingsRes, riskRes, forecastRes] = await Promise.all([
          getReadings(id),
          getCurrentRisk(id),
          getRiskForecast(id), // ⬅ NEW
        ]);

        setReadings(readingsRes.data);
        setRisk(riskRes.data);
        setRiskForecast(forecastRes.data); // ⬅ NEW
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
  // triggerSimulation wrapped in useCallback
  // -------------------------------------------------------
  const triggerSimulation = useCallback(
    async (id, mode) => {
      try {
        const simRes = mode
          ? await simulateReading(id, mode)
          : await simulateReading(id);

        const { reading } = simRes.data;

        // Update readings list (for chart + live vitals)
        setReadings((prev) => [reading, ...prev].slice(0, 100));

        // Refresh risk + forecast together
        const [riskRes, forecastRes] = await Promise.all([
          getCurrentRisk(id),
          getRiskForecast(id), // ⬅ NEW
        ]);
        const latestRisk = riskRes.data;
        setRisk(latestRisk);
        setRiskForecast(forecastRes.data); // ⬅ NEW

        // Push alert if needed
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
  // useEffect with correct deps
  // -------------------------------------------------------
  useEffect(() => {
    if (!resolvedPatientId) {
      navigate("/login", { replace: true });
      return;
    }

    fetchData(resolvedPatientId);

    const interval = setInterval(() => {
      // normal mode auto-simulation every 15s
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

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <div className="dashboard-bg">
      <div className="dashboard-bg-inner">
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

        {/* Top bar: title + AI health search icon button */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="text-white fw-bold mb-0">
            Maternal–Fetal Health Dashboard
          </h3>

          <button
            className="ai-search-btn"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-ai-health-search", {
                  detail: { patientId: resolvedPatientId },
                })
              )
            }
          >
            🔍 Ask AI Health
          </button>
        </div>

        {/* Friendly banner */}
        <div className="welcome-banner mb-4">
          <h4 className="welcome-title">👶 Maternal–Fetal Health Monitoring</h4>
          <p className="welcome-text">
            This dashboard continuously monitors maternal and fetal vitals,
            combining medical heuristics with advanced machine-learning models
            to provide early detection of potential risks and support a safe,
            healthy pregnancy journey.
          </p>
        </div>

        {/* Real-time banner using current risk */}
        <RiskAlertBanner risk={risk} loading={loadingRisk} />

        {/* ROW 1: Wide vitals + profile on right */}
        <Row className="mb-4">
          <Col md={8}>
            <LiveVitalsCard readings={readings} />
          </Col>
          <Col md={4}>
            <PatientInfoCard patientId={resolvedPatientId} />
          </Col>
        </Row>

        {/* ROW 2: Current risk as a horizontal bar */}
        <Row className="mb-4">
          <Col md={12}>
            <div className="risk-horizontal-wrapper">
              <RiskStatusCard risk={risk} loading={loadingRisk} />
            </div>
          </Col>
        </Row>

        {/* ROW 3: Actions */}
        <Row className="mb-4">
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

        {/* ROW 4: Trend chart + AI forecast + Alerts */}
        <Row>
          <Col md={8}>
            <VitalsChart readings={readings} />
            {/* NEW: AI risk timeline forecast below chart */}
            <div className="mt-3">
              <RiskForecastCard forecast={riskForecast} />
            </div>
          </Col>
          <Col md={4}>
            <AlertsPanel alerts={alerts} />
          </Col>
        </Row>

        {/* Modals */}
        <ExplainRiskModal />
        <AiHealthSearchModal />
        <CareCoachModal /> 
      </div>
    </div>
  );
};

export default DashboardPage;