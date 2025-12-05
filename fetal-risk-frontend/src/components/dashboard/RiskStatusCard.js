import React from 'react';
import { Card, Badge } from 'react-bootstrap';

const getVariant = (riskLevel) => {
  if (riskLevel === 'critical') return 'danger';
  if (riskLevel === 'warning') return 'warning';
  if (riskLevel === 'normal') return 'success';
  return 'secondary';
};

const RiskStatusCard = ({ risk }) => {
  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title>Current Risk</Card.Title>
        {risk ? (
          <>
            <h3 className="mt-2">
              <Badge bg={getVariant(risk.risk_level)} className="px-3 py-2">
                {risk.risk_level.toUpperCase()}
              </Badge>
            </h3>
            <div className="mt-3 small text-soft">
              Score: {risk.risk_score?.toFixed(2)}
              <br />
              {risk.reason}
            </div>
          </>
        ) : (
          <div className="text-soft">No risk data available.</div>
        )}
      </Card.Body>
    </Card>
  );
};

export default RiskStatusCard;
