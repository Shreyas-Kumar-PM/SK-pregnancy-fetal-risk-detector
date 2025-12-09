// src/components/dashboard/RiskForecastCard.js
import React from "react";
import { Card, Badge } from "react-bootstrap";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const RiskForecastCard = ({ forecast }) => {
  if (!forecast || !forecast.points || forecast.points.length === 0) {
    return (
      <Card className="shadow-sm mb-3">
        <Card.Body>
          <Card.Title>AI Risk Timeline (Next 12h)</Card.Title>
          <div className="text-soft small">
            Not enough data yet to generate a forecast.
          </div>
        </Card.Body>
      </Card>
    );
  }

  const data = forecast.points.map((p) => ({
    ...p,
    label: `${p.horizon_hours}h`,
  }));

  const currentLevel = forecast.points[forecast.points.length - 1].risk_level;

  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Card.Title className="mb-0">
            AI Risk Timeline (Next 12h)
          </Card.Title>
          <Badge bg="secondary" className="small">
            Experimental
          </Badge>
        </div>

        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" />
              <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} />
              <Tooltip
                formatter={(value, name) =>
                  name === "risk_score"
                    ? [value.toFixed(2), "Predicted risk score"]
                    : [value, name]
                }
                labelFormatter={(label) => `+${label} from now`}
              />
              <Line
                type="monotone"
                dataKey="risk_score"
                stroke="#f97373"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="small text-soft mt-2">
          Forecast based on recent risk trends (method:{" "}
          {forecast.method || "trend_extrapolation_v1"}). Current trajectory
          suggests{" "}
          <strong>
            {currentLevel ? currentLevel.toUpperCase() : "UNKNOWN"} risk
          </strong>{" "}
          within the next 12 hours.
          <br />
          This is an experimental AI helper and does not replace medical advice.
        </div>
      </Card.Body>
    </Card>
  );
};

export default RiskForecastCard;
