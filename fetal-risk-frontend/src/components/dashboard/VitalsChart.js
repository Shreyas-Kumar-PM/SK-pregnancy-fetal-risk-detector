import React from 'react';
import { Card } from 'react-bootstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const VitalsChart = ({ readings }) => {
  const data = readings
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.recorded_at).toLocaleTimeString(),
      fetal_hr: r.fetal_hr,
      maternal_hr: r.maternal_hr,
      systolic_bp: r.systolic_bp,
    }));

  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title>Trend (last readings)</Card.Title>
        <div style={{ width: '100%', height: 280 }} className="chart-container">
          <ResponsiveContainer>
            <LineChart data={data}>
              <XAxis dataKey="time" stroke="#9A9CA0" />
              <YAxis stroke="#9A9CA0" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1C1F',
                  borderColor: '#2B2E31',
                  color: '#E6E6E8',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="fetal_hr" stroke="#1E3A8A" />
              <Line type="monotone" dataKey="maternal_hr" stroke="#C49A6C" />
              <Line type="monotone" dataKey="systolic_bp" stroke="#E84545" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VitalsChart;
