import React, { useEffect, useState } from "react";
import { Card, Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../api/patientsApi";

const PatientsListPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setError(null);
        const res = await getPatients();
        if (!cancelled) {
          setPatients(res.data);
        }
      } catch (err) {
        console.error("Failed to load patients:", err);
        if (!cancelled) {
          setError("Failed to load patients list.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []); // no warning now – fetchData is defined inside the effect

  const handleOpenPatient = (patient) => {
    // remember selected patient for sidebar routes
    localStorage.setItem("patientId", patient.id);
    navigate(`/patients/${patient.id}/dashboard`);
  };

  return (
    <div className="p-3">
      <h2 className="text-white mb-4">Patients</h2>

      <Card className="bg-dark text-white shadow-sm">
        <Card.Body>
          {error && (
            <div className="alert alert-danger py-2 mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-soft">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="text-soft">No patients found yet.</div>
          ) : (
            <Table hover responsive borderless className="mb-0 text-white">
              <thead className="border-bottom border-secondary">
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gestation</th>
                  <th>Gravida</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.age}</td>
                    <td>{p.gestation_weeks} wks</td>
                    <td>{p.gravida}</td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-info"
                        onClick={() => handleOpenPatient(p)}
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PatientsListPage;
