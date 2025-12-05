import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { getPatient } from '../../api/patientsApi';

const PatientInfoCard = ({ patientId }) => {
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    getPatient(patientId).then((res) => setPatient(res.data));
  }, [patientId]);

  if (!patient) return null;

  return (
    <Card className="shadow-sm mb-3">
      <Card.Body>
        <Card.Title>Patient Profile</Card.Title>
        <div className="fw-semibold mt-2">{patient.name}</div>
        <div className="small text-soft mt-1">
          Age: {patient.age} yrs
          <br />
          Gestation: {patient.gestation_weeks} weeks
          <br />
          Gravida: {patient.gravida}
        </div>
        <div className="small text-soft mt-3">
          Contact: {patient.contact_number}
          <br />
          Email: {patient.email}
        </div>
      </Card.Body>
    </Card>
  );
};

export default PatientInfoCard;
