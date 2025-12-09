// src/components/AiDietPlanCard.js
import React, { useEffect, useState } from "react";
import { Card, Form, Button, Spinner, Table } from "react-bootstrap";
import { getDietPlan } from "../api/aiApi";

const AiDietPlanCard = ({ patientId }) => {
  const [resolvedPatientId, setResolvedPatientId] = useState(patientId || null);
  const [cuisine, setCuisine] = useState("Indian");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("");
  const [error, setError] = useState(null);

  // Resolve patient from localStorage if not passed in
  useEffect(() => {
    if (patientId) {
      setResolvedPatientId(patientId);
    } else {
      const stored = localStorage.getItem("patientId");
      setResolvedPatientId(stored);
    }
  }, [patientId]);

  const handleGenerate = async () => {
    if (!resolvedPatientId) {
      setError("No patient selected. Please open a patient first.");
      return;
    }

    setError(null);
    setPlan("");
    setLoading(true);

    try {
      const res = await getDietPlan(resolvedPatientId, cuisine, date);
      const data = res.data || {};
      setPlan(data.diet_plan || "No diet plan was returned.");
    } catch (err) {
      console.error("Diet plan error:", err);
      setError(
        "Sorry, I couldn't generate a diet plan right now. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Pretty rendering for diet plan
  // -----------------------------
  const renderPlanContent = () => {
    if (!plan) return null;

    // Split into trimmed non-empty lines
    const lines = plan
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return null;

    // Helper: markdown table row
    const isMarkdownRow = (line) =>
      line.startsWith("|") && line.endsWith("|") && line.split("|").length > 3;

    const firstTableIndex = lines.findIndex(isMarkdownRow);

    // If no markdown table lines → simple paragraph box fallback
    if (firstTableIndex === -1) {
      return (
        <div
          className="mt-3 ai-diet-plan-box"
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.14)",
            padding: 14,
            maxHeight: 260,
            overflowY: "auto",
            fontSize: "0.9rem",
            whiteSpace: "pre-line",
          }}
        >
          {plan}
        </div>
      );
    }

    // Intro text above the table
    const introLines = lines.slice(0, firstTableIndex);
    const tableLines = lines.slice(firstTableIndex);

    // Remove separator rows (---|---|---)
    const cleanedTableLines = tableLines.filter((line) => {
      if (!isMarkdownRow(line)) return false;
      const inner = line.replace(/\|/g, "").trim();
      // if it's just dashes, it's a separator
      if (/^-+$/.test(inner) || /^-+(\s*-+)*$/.test(inner)) return false;
      return true;
    });

    if (cleanedTableLines.length === 0) {
      // fallback to paragraph if somehow table got stripped
      return (
        <div
          className="mt-3 ai-diet-plan-box"
          style={{
            background: "rgba(0, 0, 0, 0.35)",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.14)",
            padding: 14,
            maxHeight: 260,
            overflowY: "auto",
            fontSize: "0.9rem",
            whiteSpace: "pre-line",
          }}
        >
          {plan}
        </div>
      );
    }

    const headerCells = cleanedTableLines[0]
      .slice(1, -1)
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const bodyLines = cleanedTableLines.slice(1);
    const rows = bodyLines.map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
    );

    return (
      <div
        className="mt-3 ai-diet-plan-box"
        style={{
          background: "rgba(0, 0, 0, 0.35)",
          borderRadius: 12,
          border: "1px solid rgba(255, 255, 255, 0.14)",
          padding: 14,
          maxHeight: 260,
          overflowY: "auto",
          fontSize: "0.9rem",
        }}
      >
        {introLines.length > 0 && (
          <div
            className="mb-3 small"
            style={{
              color: "#f5f5f5",
              lineHeight: 1.5,
            }}
          >
            {introLines.join(" ")}
          </div>
        )}

        <Table
          bordered
          size="sm"
          variant="dark"
          className="mb-0"
          style={{
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr>
              {headerCells.map((h, idx) => (
                <th
                  key={idx}
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(59,130,246,0.5), rgba(96,165,250,0.4))",
                    borderColor: "rgba(148,163,184,0.5)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cols, rIdx) => (
              <tr key={rIdx}>
                {headerCells.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    style={{
                      borderColor: "rgba(148,163,184,0.25)",
                      verticalAlign: "top",
                    }}
                  >
                    {cols[cIdx] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Card className="shadow-sm mb-3 ai-diet-card">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Card.Title className="mb-0">
            🥗 AI Daily Diet Planner
          </Card.Title>
          <span className="badge bg-info bg-opacity-75 small">
            Wellness assistant
          </span>
        </div>

        <p className="small text-soft mb-3">
          Get a gentle, pregnancy-friendly diet outline for the day based on
          recent readings. This is educational only and does not replace your
          doctor or dietician.
        </p>

        <Form className="mb-2">
          <div className="d-flex flex-wrap gap-3">
            <Form.Group style={{ minWidth: 180 }}>
              <Form.Label className="small mb-1">
                Preferred cuisine
              </Form.Label>
              <Form.Select
                size="sm"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
              >
                <option value="Indian">Indian</option>
                <option value="South Indian">South Indian</option>
                <option value="North Indian">North Indian</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese / Sushi">
                  Japanese / Sushi
                </option>
                <option value="Mediterranean">Mediterranean</option>
                <option value="Continental">Continental</option>
                <option value="Mixed">Surprise me (mixed)</option>
              </Form.Select>
            </Form.Group>

            <Form.Group style={{ minWidth: 160 }}>
              <Form.Label className="small mb-1">Day</Form.Label>
              <Form.Control
                size="sm"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Form.Group>

            <div className="d-flex align-items-end">
              <Button
                size="sm"
                variant="primary"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      animation="border"
                      size="sm"
                      className="me-2"
                    />
                    Planning…
                  </>
                ) : (
                  "Generate plan"
                )}
              </Button>
            </div>
          </div>
        </Form>

        {error && (
          <div className="small text-danger mt-2">
            {error}
          </div>
        )}

        {renderPlanContent()}
      </Card.Body>
    </Card>
  );
};

export default AiDietPlanCard;
