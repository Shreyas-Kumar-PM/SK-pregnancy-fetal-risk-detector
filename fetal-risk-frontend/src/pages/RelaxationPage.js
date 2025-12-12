// src/pages/RelaxationPage.js
import React, { useEffect, useRef, useState } from "react";
import { Card, Row, Col, Button, Form, ListGroup } from "react-bootstrap";

/**
 * Gentle guided breathing + relaxation module.
 *
 * - Presets (inhale - hold - exhale) in seconds.
 * - Animated circle expands/contracts with breathing.
 * - Gentle tone using WebAudio during inhale and exhale.
 * - Sessions saved in localStorage (last 10).
 *
 * No backend changes; safe to drop into your frontend.
 */

const PRESETS = [
  { id: "box", name: "Box (4-4-4-4)", inhale: 4, hold: 4, exhale: 4, hold2: 4, durationMin: 3 },
  { id: "relax", name: "Relax (4-2-6)", inhale: 4, hold: 2, exhale: 6, hold2: 0, durationMin: 5 },
  { id: "calm", name: "Calm (6-2-6)", inhale: 6, hold: 2, exhale: 6, hold2: 0, durationMin: 5 },
  { id: "custom", name: "Custom", inhale: 4, hold: 2, exhale: 6, hold2: 0, durationMin: 5 },
];

const LS_KEY = "relax_sessions_v1";

const formatTime = (s) => {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
};

const RelaxationPage = () => {
  const [preset, setPreset] = useState(PRESETS[0]);
  const [durationMin, setDurationMin] = useState(PRESETS[0].durationMin);
  const [isRunning, setIsRunning] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [custom, setCustom] = useState({ inhale: 4, hold: 2, exhale: 6, hold2: 0 });

  const audioCtxRef = useRef(null);
  const oscillatorRef = useRef(null);
  const timerRef = useRef(null);
  const cycleRef = useRef({}); // state for the breathing cycle

  useEffect(() => {
    // load sessions
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setSessions(JSON.parse(raw));
    } catch (e) {
      console.warn("Couldn't load relaxation sessions:", e);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // update preset duration when preset changes
    setDurationMin(preset.durationMin || 5);
    // set custom values if custom preset chosen
    if (preset.id === "custom") {
      setCustom({ inhale: preset.inhale, hold: preset.hold, exhale: preset.exhale, hold2: preset.hold2 });
    }
  }, [preset]);

  const buildCycle = (p) => {
    // build array of steps: { label, seconds }
    const steps = [];
    if (p.inhale > 0) steps.push({ label: "Inhale", seconds: p.inhale });
    if (p.hold > 0) steps.push({ label: "Hold", seconds: p.hold });
    if (p.exhale > 0) steps.push({ label: "Exhale", seconds: p.exhale });
    if (p.hold2 > 0) steps.push({ label: "Hold", seconds: p.hold2 });
    return steps;
  };

  const startAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    // create oscillator for gentle tone
    oscillatorRef.current = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillatorRef.current.type = "sine";
    oscillatorRef.current.frequency.setValueAtTime(220, ctx.currentTime);
    gain.gain.value = 0;
    oscillatorRef.current.connect(gain);
    gain.connect(ctx.destination);
    oscillatorRef.current.start();
    return { ctx, gain };
  };

  const tonePulse = (isInhale) => {
    // gentle tone pattern for inhale/exhale
    if (!audioCtxRef.current || !oscillatorRef.current) return;
    const ctx = audioCtxRef.current;
    const gain = oscillatorRef.current.context.createGain();
    oscillatorRef.current.disconnect();
    oscillatorRef.current.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (isInhale) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    } else {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    }
    // disconnect after 1.5s
    setTimeout(() => {
      try {
        gain.disconnect();
      } catch (e) {}
    }, 1500);
  };

  const start = () => {
    if (isRunning) return;
    // create audio if available (may require user gesture)
    try {
      startAudio();
    } catch (e) {
      // ignore audio errors silently
      console.warn("Audio context init failed:", e);
    }

    setIsRunning(true);
    setSessionSeconds(durationMin * 60);
    setTimeLeft(durationMin * 60);

    // prepare cycle
    const p = preset.id === "custom" ? { ...custom, durationMin } : { ...preset, durationMin };
    const cycle = buildCycle(p);
    cycleRef.current = {
      cycle,
      idx: 0,
      stepSecondsRemaining: cycle.length > 0 ? cycle[0].seconds : 0,
      totalSeconds: durationMin * 60,
    };
    setPhaseLabel(cycle.length > 0 ? cycle[0].label : "");
    // kickoff timer
    timerRef.current = setInterval(() => tick(), 1000);
  };

  const stop = (save = true) => {
    setIsRunning(false);
    setPhaseLabel("");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
    } catch (e) {}
    oscillatorRef.current = null;
    // save session if wanted
    if (save && sessionSeconds > 0) {
      const record = {
        date: new Date().toISOString(),
        durationSec: (durationMin * 60) - timeLeft,
        preset: preset.id === "custom" ? "custom" : preset.id,
      };
      const updated = [record, ...sessions].slice(0, 10);
      setSessions(updated);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(updated));
      } catch (e) {}
    }
    setSessionSeconds(0);
  };

  const tick = () => {
    setTimeLeft((prev) => {
      const n = prev - 1;
      setSessionSeconds((s) => s + 1);
      // update cycle
      const cyc = cycleRef.current;
      if (!cyc || !cyc.cycle || cyc.cycle.length === 0) {
        // nothing to animate
      } else {
        cyc.stepSecondsRemaining -= 1;
        if (cyc.stepSecondsRemaining <= 0) {
          // advance
          cyc.idx = (cyc.idx + 1) % cyc.cycle.length;
          cyc.stepSecondsRemaining = cyc.cycle[cyc.idx].seconds;
          setPhaseLabel(cyc.cycle[cyc.idx].label);
          // play tone on phase change
          try {
            tonePulse(cyc.cycle[cyc.idx].label.toLowerCase().includes("inhale"));
          } catch (e) {}
        }
      }
      if (n <= 0) {
        // session complete
        stop(true);
        return 0;
      }
      return n;
    });
  };

  const handlePresetSelect = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) setPreset(p);
  };

  const handleCustomChange = (k, v) => {
    setCustom((c) => ({ ...c, [k]: Number(v) }));
  };

  const resetHistory = () => {
    localStorage.removeItem(LS_KEY);
    setSessions([]);
  };

  // Animated circle scale calculation based on current phase progress
  const circleScale = (() => {
    const cyc = cycleRef.current;
    if (!cyc || !cyc.cycle || cyc.cycle.length === 0) return 1;
    const step = cyc.cycle[cyc.idx];
    const stepTotal = step.seconds;
    const remain = cyc.stepSecondsRemaining;
    const elapsed = stepTotal - remain;
    if (!step) return 1;
    // inhale => expand (scale 0.6 -> 1.15), exhale => contract (1.15 -> 0.6), hold => stay
    const label = step.label.toLowerCase();
    if (label.includes("inhale")) {
      const t = elapsed / (stepTotal || 1);
      return 0.6 + 0.55 * t;
    } else if (label.includes("exhale")) {
      const t = elapsed / (stepTotal || 1);
      return 1.15 - 0.55 * t;
    } else {
      return 1.0;
    }
  })();

  return (
    <div className="p-3">
      <h2 className="text-white mb-4"> Relaxation & Guided Breathing</h2>

      <Row className="g-4">
        <Col md={7}>
          <Card className="bg-dark text-white shadow-sm p-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="mb-1">Guided Breathing</h5>
                <div className="text-soft small">
                  Choose a breathing pattern and tap Start. A gentle tone and animation will guide you.
                </div>
              </div>

              <div className="text-end">
                <div className="small text-soft">Session</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatTime(timeLeft)}</div>
                <div className="small text-soft">Remaining</div>
              </div>
            </div>

            <hr style={{ borderColor: "rgba(255,255,255,0.06)" }} />

            <div className="d-flex flex-wrap gap-2 mb-3">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={preset.id === p.id ? "info" : "outline-secondary"}
                  onClick={() => handlePresetSelect(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </div>

            {preset.id === "custom" && (
              <div className="mb-3">
                <Form>
                  <div className="d-flex gap-2 flex-wrap">
                    <Form.Group style={{ minWidth: 110 }}>
                      <Form.Label className="small text-soft">Inhale (s)</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={custom.inhale}
                        min={1}
                        onChange={(e) => handleCustomChange("inhale", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group style={{ minWidth: 110 }}>
                      <Form.Label className="small text-soft">Hold (s)</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={custom.hold}
                        min={0}
                        onChange={(e) => handleCustomChange("hold", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group style={{ minWidth: 110 }}>
                      <Form.Label className="small text-soft">Exhale (s)</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={custom.exhale}
                        min={1}
                        onChange={(e) => handleCustomChange("exhale", e.target.value)}
                      />
                    </Form.Group>
                    <Form.Group style={{ minWidth: 110 }}>
                      <Form.Label className="small text-soft">Hold2 (s)</Form.Label>
                      <Form.Control
                        size="sm"
                        type="number"
                        value={custom.hold2}
                        min={0}
                        onChange={(e) => handleCustomChange("hold2", e.target.value)}
                      />
                    </Form.Group>
                  </div>
                </Form>
              </div>
            )}

            <div className="d-flex align-items-center gap-3 mb-3">
              <Form.Group className="me-2">
                <Form.Label className="small text-soft mb-1">Duration (min)</Form.Label>
                <Form.Control
                  size="sm"
                  type="number"
                  min={1}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Math.max(1, Number(e.target.value)))}
                />
              </Form.Group>

              <div className="ms-auto">
                {!isRunning ? (
                  <Button size="sm" variant="primary" onClick={start}>
                    Start
                  </Button>
                ) : (
                  <Button size="sm" variant="danger" onClick={() => stop(false)}>
                    Stop
                  </Button>
                )}
              </div>
            </div>

            <div className="text-center my-3">
              <div
                className="breath-circle mx-auto"
                style={{
                  transform: `scale(${isRunning ? circleScale : 1})`,
                }}
              />
              <div className="mt-2">
                <div className="h5 mb-0">{phaseLabel || "—"}</div>
                <div className="small text-soft">Follow the circle and tone</div>
              </div>
            </div>

            <div className="mt-3 small text-soft">
              Tip: Click Start once to allow audio; your browser may ask to allow sound.
            </div>
          </Card>
        </Col>

        <Col md={5}>
          <Card className="bg-dark text-white shadow-sm p-3 mb-3">
            <h6 className="mb-2">Session Summary</h6>
            <div className="text-soft small mb-2">Quick past sessions (stored locally)</div>
            <ListGroup variant="flush" className="mb-2">
              {sessions.length === 0 && (
                <div className="small text-soft">No sessions yet</div>
              )}
              {sessions.map((s, i) => (
                <ListGroup.Item key={i} className="bg-transparent border-0 px-0 py-2">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{s.preset}</strong>
                      <div className="small text-soft">{new Date(s.date).toLocaleString()}</div>
                    </div>
                    <div className="text-end small">
                      {formatTime(s.durationSec)}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" onClick={() => { setSessions([]); resetHistory(); }}>
                Clear
              </Button>
              <Button size="sm" variant="outline-info" onClick={() => {
                // quick share: copy summary text
                const text = sessions.map(s => `${s.preset} • ${new Date(s.date).toLocaleString()} • ${formatTime(s.durationSec)}`).join("\n");
                navigator.clipboard?.writeText(text);
                alert("Session summary copied to clipboard");
              }}>
                Share
              </Button>
            </div>
          </Card>

          <Card className="bg-dark text-white shadow-sm p-3">
            <h6 className="mb-2">How to use</h6>
            <ul className="small text-soft mb-0" style={{ paddingLeft: 18 }}>
              <li>Choose a preset (or custom) and duration.</li>
              <li>Press Start and breathe with the circle: inhale → hold → exhale.</li>
              <li>Use headphones for best experience; audio starts on first gesture.</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RelaxationPage;
