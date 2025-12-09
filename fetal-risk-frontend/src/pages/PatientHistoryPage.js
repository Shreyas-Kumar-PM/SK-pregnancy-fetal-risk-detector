// src/pages/PatientHistoryPage.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Table, Row, Col, Button, Spinner } from "react-bootstrap";
import { getReadings } from "../api/readingsApi";
import { getRiskHistory } from "../api/riskApi";
import { analyzePatterns } from "../api/aiPatternsApi";

const PatientHistoryPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [readings, setReadings] = useState([]);
  const [riskHistory, setRiskHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI pattern explorer states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!patientId || patientId === "undefined") {
        const stored = localStorage.getItem("patientId");
        if (stored) {
          navigate(`/patients/${stored}/history`, { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const [readingsRes, riskRes] = await Promise.all([
          getReadings(patientId),
          getRiskHistory(patientId).catch(() => ({ data: [] })),
        ]);

        setReadings(readingsRes.data || []);
        setRiskHistory(riskRes.data || []);
      } catch (err) {
        console.error("Error loading history:", err);
        const status = err.response?.status;
        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("patientId");
          navigate("/login");
        } else if (status === 404) {
          setError("No history found for this patient.");
        } else {
          setError("Failed to load history.");
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId, navigate]);

  // 🔵 AI Pattern Explorer action
  const handleAnalyzePatterns = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiSummary("");

      const res = await analyzePatterns(patientId);
      setAiSummary(res.data.summary || "No patterns detected.");
    } catch (err) {
      console.error(err);
      setAiError("AI pattern explorer is unavailable. Try later.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="alert alert-danger py-2 mb-3">{error}</div>
      )}

      {/* FULL-WIDTH Reading History */}
      <Row>
        <Col md={12}>
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Reading History</Card.Title>
              <div className="small text-soft mb-2">Latest readings first</div>

              {loading ? (
                <div className="text-soft">Loading readings...</div>
              ) : (
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
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
      </Row>

      {/* FULL-WIDTH Risk History BELOW */}
      <Row>
        <Col md={12}>
          <Card className="shadow-sm mb-3">
            <Card.Body>
              <Card.Title>Risk History</Card.Title>
              <div className="small text-soft mb-2">Recent risk evaluations</div>

              {loading ? (
                <div className="text-soft">Loading risk history...</div>
              ) : riskHistory.length === 0 ? (
                <div className="text-soft">No risk history available yet.</div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {riskHistory.map((h) => (
                    <div key={h.id} className="mb-2">
                      <div>
                        <strong>{h.risk_level?.toUpperCase()}</strong>{" "}
                        – Score: {h.risk_score?.toFixed(2)}
                      </div>
                      <div className="small text-soft">
                        {h.reason}
                        <br />
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                      <hr style={{ borderColor: "#2B2E31" }} />
                    </div>
                  ))}
                </div>
              )}

              {/* 🔵 AI Pattern Explorer */}
              <hr style={{ borderColor: "#2B2E31" }} />

              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <div className="ai-pattern-title small">
                      🧠 AI Pattern Explorer
                    </div>
                    <div className="ai-pattern-description">
                      Let AI scan your historical data to spot trends and subtle changes.
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="ai-pattern-btn"
                    onClick={handleAnalyzePatterns}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "Analyzing..." : "Analyze History"}
                  </Button>
                </div>

                {aiLoading && (
                  <div className="small text-soft d-flex align-items-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Analyzing patterns…
                  </div>
                )}

                {aiError && (
                  <div className="small text-danger mt-2">{aiError}</div>
                )}

                {aiSummary && !aiLoading && (
                  <div className="ai-pattern-result mt-2">
                    {aiSummary}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PatientHistoryPage;
