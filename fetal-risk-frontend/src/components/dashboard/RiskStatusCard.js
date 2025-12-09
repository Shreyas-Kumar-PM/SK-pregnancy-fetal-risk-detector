import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';

const getVariant = (riskLevel) => {
  if (riskLevel === 'critical') return 'danger';
  if (riskLevel === 'warning') return 'warning';
  if (riskLevel === 'normal') return 'success';
  return 'secondary';
};

const RiskStatusCard = ({ risk }) => {
  if (!risk) {
    return (
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Card.Title>Current Risk</Card.Title>
          <div className="text-soft">No risk data available.</div>
        </Card.Body>
      </Card>
    );
  }

  const {
    risk_level,
    risk_score,
    reason,
    model_version,
    ml_risk_level,
    ml_class_probabilities,
    ml_logreg_risk_level,
    ml_logreg_class_probabilities
  } = risk;

  const scoreText =
    typeof risk_score === 'number' ? risk_score.toFixed(2) : 'N/A';

  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title>Current Risk</Card.Title>

        {risk_level ? (
          <h3 className="mt-2">
            <Badge bg={getVariant(risk_level)} className="px-3 py-2">
              {risk_level.toUpperCase()}
            </Badge>
          </h3>
        ) : (
          <div className="mt-2 text-soft">No risk level available.</div>
        )}

        <div className="mt-3 small text-soft">
          <div>
            <strong>Score:</strong> {scoreText}
          </div>

          {reason && (
            <div className="mt-1">
              <strong>Reason:</strong> {reason}
            </div>
          )}

          {/* Model type (Heuristic-only or Heuristic + RF) */}
          {model_version && (
            <div className="mt-2">
              <strong>Model:</strong> {model_version}
            </div>
          )}

          {/* RF/PSO ML Model Output */}
          {ml_risk_level && (
            <div className="mt-2">
              <strong>RF (PSO) ML Risk Level:</strong> {ml_risk_level}
            </div>
          )}

          {ml_class_probabilities && (
            <div className="mt-2">
              <strong>RF ML Probabilities:</strong>
              <ul className="mb-0">
                {Object.entries(ml_class_probabilities).map(([label, p]) => (
                  <li key={label}>
                    {label}: {(p * 100).toFixed(1)}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 🔵 Logistic Regression Model Output */}
          {ml_logreg_risk_level && (
            <div className="mt-3">
              <strong>Logistic Regression Risk:</strong> {ml_logreg_risk_level}
            </div>
          )}

          {ml_logreg_class_probabilities && (
            <div className="mt-2">
              <strong>LogReg Probabilities:</strong>
              <ul className="mb-0">
                {Object.entries(ml_logreg_class_probabilities).map(
                  ([label, p]) => (
                    <li key={label}>
                      {label}: {(p * 100).toFixed(1)}%
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ⭐ NEW – "Explain My Risk" Button */}
        <Button
          variant="outline-light"
          size="sm"
          className="mt-3 w-100"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("explain-risk", { detail: risk })
            )
          }
        >
          🤖 Explain My Risk
        </Button>
      </Card.Body>
    </Card>
  );
};

export default RiskStatusCard;
