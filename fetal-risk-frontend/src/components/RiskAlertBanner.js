// src/components/RiskAlertBanner.js
import React from "react";
import { Alert } from "react-bootstrap";

const RiskAlertBanner = ({ risk, loading }) => {
  if (loading) return null;
  if (!risk || !risk.risk_level || risk.risk_level === "normal") return null;

  const level = risk.risk_level.toLowerCase();
  const isCritical = level === "critical";
  const isWarning = level === "warning";

  const variant = isCritical ? "danger" : "warning";
  const label = isCritical ? "CRITICAL RISK" : "WARNING RISK";

  const updatedAt =
    risk.updated_at || risk.created_at || risk.evaluated_at || null;

  return (
    <Alert
      variant={variant}
      className="d-flex align-items-center justify-content-between mb-3"
      style={{
        borderRadius: 999,
        background: isCritical
          ? "linear-gradient(90deg, #b71c1c, #f44336)"
          : "linear-gradient(90deg, #f57f17, #ffca28)",
        color: "#fff",
      }}
    >
      <div className="d-flex align-items-center">
        <span className="me-2">{isCritical ? "🚨" : "⚠️"}</span>
        <div>
          <div className="fw-bold">{label}</div>
          <div className="small">
            {risk.reason || "Recent evaluation indicates elevated risk."}
          </div>
          {updatedAt && (
            <div className="small opacity-75">
              Last evaluated:{" "}
              {new Date(updatedAt).toLocaleString("en-IN", {
                hour12: true,
              })}
            </div>
          )}
        </div>
      </div>
      <div className="ms-3">
        {isCritical && (
          <span className="badge bg-light text-danger me-2">
            Immediate review recommended
          </span>
        )}
        {isWarning && (
          <span className="badge bg-dark text-warning">
            Increased monitoring
          </span>
        )}
      </div>
    </Alert>
  );
};

export default RiskAlertBanner;
