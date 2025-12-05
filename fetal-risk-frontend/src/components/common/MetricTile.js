import React from 'react';
import { Card } from 'react-bootstrap';

const MetricTile = ({ label, value, icon }) => {
  return (
    <Card className="border-0 shadow-sm mb-3 metric-tile">
      <Card.Body className="d-flex align-items-center">
        {icon && (
          <img
            src={icon}
            alt={label}
            style={{ width: 40, height: 40, marginRight: 16 }}
          />
        )}
        <div>
          <div className="small text-soft">{label}</div>
          <div className="fs-5 fw-semibold">{value}</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MetricTile;
