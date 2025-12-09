// src/pages/AnalyticsDashboard.js
import React, { useEffect, useState } from "react";
import { Row, Col, Card, Spinner } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";

import {
  getPatientReadings,
  getPatientEvaluations,
} from "../api/analyticsApi";

const RISK_COLORS = {
  normal: "#4CAF50",
  warning: "#FFC107",
  critical: "#F44336",
};

const AnalyticsDashboard = () => {
  const { patientId: routePatientId } = useParams();
  const navigate = useNavigate();

  // If missing, fallback to localStorage
  const patientId = routePatientId || localStorage.getItem("patientId");

  // We only ever *set* these and don't read the raw arrays,
  // so we drop the first element to avoid ESLint "unused" warnings.
  const [, setReadings] = useState([]);
  const [, setEvaluations] = useState([]);

  const [pieData, setPieData] = useState([]);
  const [riskTimeline, setRiskTimeline] = useState([]);
  const [readingsWithLabel, setReadingsWithLabel] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -----------------------------
  // Fetch analytics data
  // -----------------------------
  useEffect(() => {
    if (!patientId) {
      navigate("/patients");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [rRes, eRes] = await Promise.all([
          getPatientReadings(patientId),
          getPatientEvaluations(patientId),
        ]);

        const rData =
          (rRes.data || []).slice().sort(
            (a, b) => new Date(a.recorded_at) - new Date(b.recorded_at)
          );

        const eData = eRes.data || [];

        // keep setters (for future potential use) but we don't read them
        setReadings(rData);
        setEvaluations(eData);

        // Format for charts
        const formattedReadings = rData.map((r, index) => ({
          ...r,
          idx: index + 1,
          label: new Date(r.recorded_at).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        const formattedEval = eData.map((e, index) => ({
          ...e,
          idx: index + 1,
          label: new Date(e.created_at).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setReadingsWithLabel(formattedReadings);
        setRiskTimeline(formattedEval);

        // Pie chart distribution
        const pie = [
          {
            name: "Normal",
            value: formattedEval.filter((e) => e.risk_level === "normal").length,
            key: "normal",
          },
          {
            name: "Warning",
            value: formattedEval.filter((e) => e.risk_level === "warning").length,
            key: "warning",
          },
          {
            name: "Critical",
            value: formattedEval.filter((e) => e.risk_level === "critical").length,
            key: "critical",
          },
        ].filter((p) => p.value > 0);

        setPieData(pie);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId, navigate]);

  // -----------------------------
  // UI Rendering
  // -----------------------------
  return (
    <div className="p-3">
      <h2 className="text-white mb-4">Analytics</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="d-flex align-items-center text-soft">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading analytics...
        </div>
      ) : (
        <>
          {/* ===========================
              TOP ROW: PIE + RISK TREND
              =========================== */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Risk Level Distribution</Card.Title>
                  <Card.Text className="text-soft">
                    Breakdown of normal, warning, and critical risks.
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={RISK_COLORS[entry.key]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Risk Score Trend</Card.Title>
                  <Card.Text className="text-soft">
                    Model risk score from 0 (low risk) to 1 (high risk).
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={riskTimeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" />
                        <YAxis domain={[0, 1]} />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine
                          y={0.4}
                          stroke="#FFC107"
                          strokeDasharray="3 3"
                        />
                        <ReferenceLine
                          y={0.8}
                          stroke="#F44336"
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="risk_score"
                          stroke="#00bcd4"
                          name="Risk Score"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ===========================
              MID ROW: MAT HR + FETAL HR
              =========================== */}
          <Row className="mb-4">
            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Maternal Heart Rate</Card.Title>
                  <Card.Text className="text-soft">
                    Maternal HR across all readings.
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={readingsWithLabel}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine
                          y={110}
                          stroke="#FFC107"
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="maternal_hr"
                          stroke="#82ca9d"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Fetal Heart Rate</Card.Title>
                  <Card.Text className="text-soft">
                    Fetal HR progression.
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <AreaChart data={readingsWithLabel}>
                        <defs>
                          <linearGradient id="fhrColor" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor="#8884d8"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8884d8"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine
                          y={110}
                          stroke="#FFC107"
                          strokeDasharray="3 3"
                        />
                        <ReferenceLine
                          y={170}
                          stroke="#F44336"
                          strokeDasharray="3 3"
                        />
                        <Area
                          type="monotone"
                          dataKey="fetal_hr"
                          stroke="#8884d8"
                          fill="url(#fhrColor)"
                          fillOpacity={1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* ===========================
              BOTTOM ROW: MOVEMENT + SPO2
              =========================== */}
          <Row>
            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>Fetal Movement Count</Card.Title>
                  <Card.Text className="text-soft">
                    Movement count per reading.
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <BarChart data={readingsWithLabel}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="fetal_movement_count"
                          fill="#9c27b0"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card className="bg-dark text-white shadow-sm h-100">
                <Card.Body>
                  <Card.Title>SpO₂ & Temperature</Card.Title>
                  <Card.Text className="text-soft">
                    Oxygen saturation & temperature trend.
                  </Card.Text>

                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer>
                      <LineChart data={readingsWithLabel}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="idx" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <ReferenceLine
                          y={94}
                          stroke="#FFC107"
                          strokeDasharray="3 3"
                        />
                        <Line
                          dataKey="spo2"
                          name="SpO₂ (%)"
                          stroke="#00e676"
                          strokeWidth={2}
                        />
                        <Line
                          dataKey="temperature"
                          name="Temp (°C)"
                          stroke="#ff7043"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
