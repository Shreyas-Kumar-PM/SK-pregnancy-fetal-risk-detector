// src/components/AiHealthSearchModal.js
import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { askHealthQuestion } from "../api/aiApi";

const AiHealthSearchModal = () => {
  const [show, setShow] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      // optional: pass patientId via event detail
      setPatientId(e.detail?.patientId || null);
      setShow(true);
      setQuestion("");
      setAnswer("");
      setLoading(false);
    };

    window.addEventListener("open-ai-health-search", handler);
    return () => window.removeEventListener("open-ai-health-search", handler);
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const res = await askHealthQuestion(question.trim(), patientId);
      setAnswer(res.data.answer || "No answer returned.");
    } catch (err) {
      console.error("AI health search failed:", err);
      setAnswer(
        "Sorry, I couldn't fetch an AI answer right now. Please try again later or ask your doctor directly."
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
      <Modal.Header
        closeButton
        style={{
          borderBottom: "none",
          paddingBottom: 0,
        }}
      >
        <Modal.Title
          style={{
            fontWeight: 700,
            fontSize: "1.35rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#ff4f7b",
          }}
        >
          <span role="img" aria-label="AI">
            🤖
          </span>
          AI Health Assistant
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ paddingTop: "0.5rem" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #fff5f8, #ffeef6)",
            borderRadius: "14px",
            padding: "10px 14px",
            marginBottom: "14px",
            border: "1px solid #ffd0e0",
          }}
        >
          <p
            className="small mb-1"
            style={{ color: "#b03a5a", fontWeight: 600 }}
          >
            Gentle guidance only 💡
          </p>
          <p
            className="mb-0"
            style={{ color: "#7a5260", fontSize: "0.86rem" }}
          >
            Ask general questions about pregnancy and maternal–fetal health.
            This assistant is for education only and{" "}
            <strong>does not replace your doctor</strong>.
          </p>
        </div>

        <Form.Group className="mb-3">
          <Form.Label style={{ fontWeight: 600 }}>Your question</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Example: Is it normal to feel dizzy in the second trimester?"
            style={{
              borderRadius: "12px",
              border: "1px solid #ffc2d4",
              boxShadow: "0 0 0 3px rgba(255, 192, 203, 0.25)",
              resize: "none",
            }}
          />
        </Form.Group>

        {loading && (
          <div className="text-center my-3">
            <Spinner animation="border" variant="danger" />
            <div className="mt-2 small text-soft">Thinking about your question…</div>
          </div>
        )}

        {answer && !loading && (
          <div
            className="mt-3"
            style={{
              background: "#fff0f4",
              borderRadius: "14px",
              border: "1px solid #ffc2d4",
              padding: "14px 16px",
              animation: "fadeIn 0.25s ease-out",
            }}
          >
            <div
              className="small mb-1"
              style={{ color: "#b03a5a", fontWeight: 600 }}
            >
              AI answer
            </div>
            <div
              style={{ whiteSpace: "pre-line", color: "#4c3d42", fontSize: "0.95rem" }}
            >
              {answer}
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer
        style={{
          borderTop: "none",
          paddingTop: 0,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="outline-secondary"
          onClick={() => setShow(false)}
          style={{
            borderRadius: "10px",
            padding: "8px 16px",
          }}
        >
          Close
        </Button>

        {!loading && (
          <Button
            onClick={handleAsk}
            disabled={!question.trim()}
            style={{
              background: "linear-gradient(135deg, #ff7eb3, #ff4f7b)",
              color: "#fff",
              fontWeight: 600,
              padding: "9px 18px",
              borderRadius: "999px",
              border: "none",
              boxShadow: "0 6px 18px rgba(255, 118, 150, 0.45)",
              opacity: question.trim() ? 1 : 0.6,
              transform: question.trim() ? "translateY(0)" : "translateY(1px)",
            }}
          >
            ✨ Ask AI
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default AiHealthSearchModal;
