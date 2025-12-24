// src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Row, Col, Button } from "react-bootstrap";
import { getReadings } from "../api/readingsApi";
import {
  getCurrentRisk,
  downloadRiskReport,
  getRiskForecast,
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
import RiskForecastCard from "../components/dashboard/RiskForecastCard";
import CareCoachModal from "../components/CareCoachModal";

const DashboardPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const resolvedPatientId =
    patientId && patientId !== "undefined"
      ? patientId
      : localStorage.getItem("patientId");

  const [readings, setReadings] = useState([]);
  const [risk, setRisk] = useState(null);
  const [riskForecast, setRiskForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(true);

  const fetchData = useCallback(
    async (id) => {
      try {
        setLoadingRisk(true);
        const [readingsRes, riskRes, forecastRes] = await Promise.all([
          getReadings(id),
          getCurrentRisk(id),
          getRiskForecast(id),
        ]);

        setReadings(readingsRes.data);
        setRisk(riskRes.data);
        setRiskForecast(forecastRes.data);
      } catch (err) {
        const status = err.response?.status;
        if (status === 401) {
          localStorage.clear();
          navigate("/login", { replace: true });
        } else {
          setError("Failed to load dashboard data.");
        }
      } finally {
        setLoadingRisk(false);
      }
    },
    [navigate]
  );

  const triggerSimulation = useCallback(
    async (id, mode) => {
      try {
        const simRes = mode
          ? await simulateReading(id, mode)
          : await simulateReading(id);

        const { reading } = simRes.data;

        setReadings((prev) => [reading, ...prev].slice(0, 100));

        const [riskRes, forecastRes] = await Promise.all([
          getCurrentRisk(id),
          getRiskForecast(id),
        ]);

        setRisk(riskRes.data);
        setRiskForecast(forecastRes.data);

        if (["warning", "critical"].includes(riskRes.data?.risk_level)) {
          setAlerts((prev) => [
            {
              timestamp: reading.recorded_at,
              level: riskRes.data.risk_level,
              message: riskRes.data.reason,
            },
            ...prev,
          ]);
        }
      } catch {
        setError("Failed to generate sample reading.");
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!resolvedPatientId) {
      navigate("/login", { replace: true });
      return;
    }

    fetchData(resolvedPatientId);

    const interval = setInterval(
      () => triggerSimulation(resolvedPatientId),
      15000
    );

    return () => clearInterval(interval);
  }, [resolvedPatientId, fetchData, triggerSimulation, navigate]);

  // 🔥 MOBILE SIDEBAR OPEN
  const openSidebar = () => {
    window.dispatchEvent(new CustomEvent("open-sidebar"));
  };

  return (
    <div className="dashboard-bg">
      <div className="dashboard-bg-inner">
        {error && <div className="alert alert-danger">{error}</div>}

        {/* 🔥 MOBILE TOP BAR */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            {/* ☰ MOBILE MENU BUTTON */}
            <button
              className="btn btn-outline-light d-md-none"
              onClick={openSidebar}
              aria-label="Open sidebar"
            >
              ☰
            </button>

            <h3 className="text-white fw-bold mb-0">
              Maternal–Fetal Health Dashboard
            </h3>
          </div>

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

        <div className="welcome-banner mb-4">
          <h4 className="welcome-title">👶 Maternal–Fetal Health Monitoring</h4>
          <p className="welcome-text">
            Continuous monitoring with ML-powered early risk detection.
          </p>
        </div>

        <RiskAlertBanner risk={risk} loading={loadingRisk} />

        <Row className="mb-4">
          <Col md={8}>
            <LiveVitalsCard readings={readings} />
          </Col>
          <Col md={4}>
            <PatientInfoCard patientId={resolvedPatientId} />
          </Col>
        </Row>

        <Row className="mb-4">
          <Col>
            <RiskStatusCard risk={risk} loading={loadingRisk} />
          </Col>
        </Row>

        <Row>
          <Col md={8}>
            <VitalsChart readings={readings} />
            <RiskForecastCard forecast={riskForecast} />
          </Col>
          <Col md={4}>
            <AlertsPanel alerts={alerts} />
          </Col>
        </Row>

        <ExplainRiskModal />
        <AiHealthSearchModal />
        <CareCoachModal />
      </div>
    </div>
  );
};

export default DashboardPage;
