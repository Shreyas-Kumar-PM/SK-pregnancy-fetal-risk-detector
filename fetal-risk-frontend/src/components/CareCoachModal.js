// src/components/CareCoachModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { getCareCoachTips } from "../api/aiApi";

const CareCoachModal = () => {
  const [show, setShow] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(false);

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
      {/* ---------- HEADER ----------- */}
      <Modal.Header
        closeButton
        className="border-0 pb-0"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Modal.Title>
          <span
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#ffffff",
              textShadow: "0 0 10px rgba(255,255,255,0.45)",
            }}
          >
            🌸 AI Pregnancy Care{" "}
            <span
              style={{
                color: "#87b7ff",
                background: "rgba(135,183,255,0.15)",
                padding: "2px 6px",
                borderRadius: "8px",
                textShadow: "0 0 8px rgba(135,183,255,0.55)",
              }}
            >
              Coach
            </span>
          </span>
        </Modal.Title>
      </Modal.Header>

      {/* ---------- BODY ----------- */}
      <Modal.Body
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          borderRadius: "12px",
        }}
      >
        <p className="text-soft small mb-3">
          These are gentle self-care suggestions based on your latest screening.
          They are educational only and{" "}
          <strong style={{ color: "#fff" }}>do not replace your doctor</strong>.
        </p>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" variant="light" />
            <div className="mt-2 small text-soft">
              Preparing personalised care tips…
            </div>
          </div>
        )}

        {!loading && !tips && (
          <div className="text-center my-2 text-soft small">
            Click the button below to get your personalised AI-generated care
            suggestions.
          </div>
        )}

        {/* ---------- TIPS BOX ---------- */}
        {tips && !loading && (
          <div
            className="ai-answer-box mt-3"
            style={{
              background: "rgba(255,255,255,0.07)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.18)",
              padding: "18px",
              color: "#eaeaea",
              boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="small"
              style={{
                fontWeight: 600,
                marginBottom: "8px",
                color: "#a7c6ff",
              }}
            >
              🌿 Care suggestions
            </div>

            <div
              style={{
                whiteSpace: "pre-line",
                lineHeight: "1.55",
                color: "#f0f0f0",
                fontSize: "0.93rem",
              }}
              className="ai-answer-text"
            >
              {tips}
            </div>
          </div>
        )}
      </Modal.Body>

      {/* ---------- FOOTER ----------- */}
      <Modal.Footer
        className="border-0"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        {!loading && !tips && (
          <Button
            variant="primary"
            onClick={handleGetTips}
            style={{
              padding: "8px 18px",
              fontWeight: 600,
              borderRadius: "10px",
              boxShadow: "0 0 12px rgba(82,150,255,0.5)",
            }}
          >
            Get Care Tips
          </Button>
        )}

        {tips && (
          <Button
            variant="outline-secondary"
            onClick={() => setShow(false)}
            style={{
              borderRadius: "10px",
            }}
          >
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default CareCoachModal;
