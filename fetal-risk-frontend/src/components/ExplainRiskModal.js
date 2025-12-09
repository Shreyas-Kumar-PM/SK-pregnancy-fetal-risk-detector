import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { explainRisk } from "../api/explainApi";
import "./ExplainRiskModal.css";   // <-- ADD THIS CSS FILE

const ExplainRiskModal = () => {
  const [show, setShow] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      setRiskData(e.detail);
      setShow(true);
      setResponse("");
    };

    window.addEventListener("explain-risk", handler);
    return () => window.removeEventListener("explain-risk", handler);
  }, []);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const res = await explainRisk(riskData);
      setResponse(res.data.explanation);
    } catch (err) {
      console.error(err);
      setResponse("⚠️ Failed to generate explanation.");
    }
    setLoading(false);
  };

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      centered
      size="lg"
      dialogClassName="ai-modal"
    >
      <Modal.Header closeButton className="ai-header">
        <Modal.Title className="ai-title">
          🤖 AI-Powered Health Explanation
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="ai-body">
        {!response && !loading && (
          <div className="ai-intro">
            <h5>Understand Your Maternal–Fetal Risk Better</h5>
            <p>
              Get a safe, friendly, AI-generated explanation of your
              current risk evaluation, based on medical heuristics and
              machine-learning insights.
            </p>
          </div>
        )}

        {loading && (
          <div className="ai-loading text-center">
            <Spinner animation="grow" variant="info" />
            <div className="mt-3 loading-text">Analyzing your data…</div>
          </div>
        )}

        {response && (
          <div className="ai-response fade-in">
            {response.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="ai-footer">
        {!response && !loading && (
          <Button className="ai-btn-generate" onClick={handleExplain}>
            🔍 Generate Explanation
          </Button>
        )}

        {response && (
          <Button className="ai-btn-close" onClick={() => setShow(false)}>
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ExplainRiskModal;
