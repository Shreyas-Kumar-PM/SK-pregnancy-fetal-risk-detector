import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import MetricTile from '../common/MetricTile';
import fetalIcon from '../../assets/images/fetal_heart.png';
import bpIcon from '../../assets/images/bp_icon.png';
import spo2Icon from '../../assets/images/spo2_icon.png';

const LiveVitalsCard = ({ readings }) => {
  const latest = readings[0];
  if (!latest) return null;

  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title className="mb-3">Live Vitals</Card.Title>
        <Row>
          <Col md={4}>
            <MetricTile
              label="Fetal Heart Rate"
              value={`${latest.fetal_hr} bpm`}
              icon={fetalIcon}
            />
          </Col>
          <Col md={4}>
            <MetricTile
              label="Maternal BP"
              value={`${latest.systolic_bp}/${latest.diastolic_bp} mmHg`}
              icon={bpIcon}
            />
          </Col>
          <Col md={4}>
            <MetricTile
              label="SpO₂"
              value={`${latest.spo2}%`}
              icon={spo2Icon}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default LiveVitalsCard;