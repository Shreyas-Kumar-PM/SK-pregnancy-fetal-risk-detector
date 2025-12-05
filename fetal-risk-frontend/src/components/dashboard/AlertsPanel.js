import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';

const badgeVariant = (level) => {
  if (level === 'critical') return 'danger';
  if (level === 'warning') return 'warning';
  return 'secondary';
};

const AlertsPanel = ({ alerts }) => {
  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title>Alerts</Card.Title>
      </Card.Body>
      <ListGroup variant="flush">
        {alerts.length === 0 && (
          <ListGroup.Item>
            <span className="text-soft">No alerts yet.</span>
          </ListGroup.Item>
        )}
        {alerts.map((a, idx) => (
          <ListGroup.Item key={idx}>
            <Badge bg={badgeVariant(a.level)} className="me-2">
              {a.level.toUpperCase()}
            </Badge>
            {a.message}
            <div className="small text-soft">
              {new Date(a.timestamp).toLocaleString()}
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};

export default AlertsPanel;
