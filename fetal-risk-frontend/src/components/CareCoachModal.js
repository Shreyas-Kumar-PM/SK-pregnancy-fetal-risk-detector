// src/components/CareCoachModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { getCareCoachTips } from "../api/aiApi";

const CareCoachModal = () => {
  const [show, setShow] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(false);

  // Listen for "open-care-coach" events from sidebar / buttons
  useEffect(() => {
    const handler = (e) => {
      const idFromEvent = e.detail?.patientId;
      const storedId = localStorage.getItem("patientId");
      setPatientId(idFromEvent || storedId || null);
      setTips("");
      setShow(true);
      setLoading(false);
    };

    window.addEventListener("open-care-coach", handler);
    return () => window.removeEventListener("open-care-coach", handler);
  }, []);

  const handleGetTips = async () => {
    if (!patientId) {
      setTips(
        "No patient information found. Please select or create a patient first."
      );
      return;
    }

    setLoading(true);
    setTips("");

    try {
      const res = await getCareCoachTips(patientId);
      setTips(res.data.tips || "No tips returned.");
    } catch (err) {
      console.error("AI care coach failed:", err);
      setTips(
        "Sorry, I couldn't fetch care tips right now. Please try again later or follow your doctor's advice."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={() => setShow(false)}
      centered
      dialogClassName="ai-health-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>🌸 AI Pregnancy Care Coach</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-soft small mb-3">
          These are gentle self-care suggestions based on your latest screening.
          They are educational only and <strong>do not replace your doctor</strong>.
        </p>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" />
            <div className="mt-2 small text-soft">
              Preparing personalised care tips…
            </div>
          </div>
        )}

        {!loading && !tips && (
          <div className="text-center my-2 text-soft small">
            Click the button below to get your AI-generated care tips.
          </div>
        )}

        {tips && !loading && (
          <div className="ai-answer-box mt-3">
            <div className="small text-soft mb-1">Care suggestions</div>
            <div
              style={{ whiteSpace: "pre-line" }}
              className="ai-answer-text"
            >
              {tips}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {!loading && !tips && (
          <Button variant="primary" onClick={handleGetTips}>
            Get Care Tips
          </Button>
        )}
        {tips && (
          <Button variant="outline-secondary" onClick={() => setShow(false)}>
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CareCoachModal;
