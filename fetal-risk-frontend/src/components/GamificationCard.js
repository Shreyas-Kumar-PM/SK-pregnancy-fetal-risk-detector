// src/pages/GamificationPage.js
import React, { useEffect, useState } from "react";
import { Row, Col, Card, ProgressBar, Button, Badge } from "react-bootstrap";
import client from "../api/axiosClient"; // adjust path if your axios client has a different path
import dayjs from "dayjs";

/**
 * GamificationPage
 *
 * - robust to null / missing data (fixes the "Cannot read properties of null" crash)
 * - fetches /api/v1/patients/:id/gamification (best-effort)
 * - shows fallback UI with mock tasks & rewards if API is missing
 *
 * Paste into src/pages/GamificationPage.js
 */
const defaultData = {
  streak_count: 0,
  last_active: null,
  points: 0,
  level: 1,
  badges: [],
  tasks: [
    // helpful sample tasks (will display if API doesn't supply tasks)
    {
      id: "t-1",
      title: "Record a reading",
      pts: 10,
      done: false,
      hint: "Open dashboard and press 'Generate Normal Sample Reading' or connect your device.",
    },
    {
      id: "t-2",
      title: "View today's care tips",
      pts: 5,
      done: false,
      hint: "Open AI Care Coach from the sidebar.",
    },
    {
      id: "t-3",
      title: "Read an article",
      pts: 3,
      done: false,
      hint: "Go to Pregnancy Articles and open one card.",
    },
  ],
};

const GamificationPage = () => {
  const pid =
    // prefer url param if your router supplies it; fallback to localStorage
    (window.location.pathname.match(/patients\/(\d+)/) || [])[1] ||
    localStorage.getItem("patientId");

  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTasks, setLocalTasks] = useState(defaultData.tasks);

  useEffect(() => {
    let cancelled = false;

    const fetchGamification = async () => {
      if (!pid) {
        // no patient selected — show fallback UI
        setLoading(false);
        setError("No patient selected.");
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Adjust endpoint if yours differs - this is a best-effort guess
        const res = await client.get(`/patients/${pid}/gamification`).catch((e) => {
          // swallow 404/500 — we'll fall back to local defaults below
          return null;
        });

        if (cancelled) return;

        if (res && res.data) {
          // be defensive: merge with defaults so missing fields don't break UI
          const merged = { ...defaultData, ...res.data };
          merged.tasks = Array.isArray(res.data.tasks) ? res.data.tasks : defaultData.tasks;
          merged.badges = Array.isArray(res.data.badges) ? res.data.badges : defaultData.badges;
          setData(merged);
          setLocalTasks(merged.tasks);
        } else {
          // no response — use defaults (no crash)
          setData(defaultData);
          setLocalTasks(defaultData.tasks);
        }
      } catch (err) {
        console.error("Gamification fetch error:", err);
        setError("Failed to load gamification. Showing defaults.");
        setData(defaultData);
        setLocalTasks(defaultData.tasks);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchGamification();
    return () => {
      cancelled = true;
    };
  }, [pid]);

  const claimTask = (taskId) => {
    // Local optimistic update — does not change backend
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: true } : t))
    );

    // Update points locally for immediate feedback
    const task = localTasks.find((t) => t.id === taskId) || {};
    setData((prev) => ({
      ...prev,
      points: prev.points + (task.pts || 0),
      streak_count: prev.streak_count + 1,
    }));

    // Fire a backend update if your API supports it (non-blocking)
    if (pid) {
      client
        .post(`/patients/${pid}/gamification/claim`, { task_id: taskId })
        .catch((e) => {
          // ignore — we already updated optimistically
          console.debug("Backend task claim failed (safe to ignore in dev):", e?.message);
        });
    }
  };

  const progressForLevel = (level, points) => {
    // simple leveling: 100 points per level (customize as needed)
    const perLevel = 100;
    const currentLevelPoints = points % perLevel;
    const pct = Math.min(100, Math.round((currentLevelPoints / perLevel) * 100));
    return { pct, perLevel, currentLevelPoints };
  };

  const { pct, perLevel, currentLevelPoints } = progressForLevel(data.level, data.points);

  return (
    <div className="p-3">
      <h2 className="text-white mb-3">🏆 Gamification & Rewards</h2>

      {error && <div className="alert alert-warning">{error}</div>}

      <Row className="mb-3">
        <Col md={6}>
          <Card className="bg-dark text-white shadow-sm p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 className="mb-1">🔥 Streak</h5>
                <div className="text-soft small">
                  Current consecutive active days
                </div>
              </div>
              <div className="text-end">
                <h3 style={{ marginBottom: 0 }}>{data?.streak_count ?? 0}</h3>
                <div className="small text-soft">
                  Last active:{" "}
                  {data.last_active ? dayjs(data.last_active).format("DD MMM") : "—"}
                </div>
              </div>
            </div>

            <hr style={{ borderColor: "#2B2E31" }} />

            <div className="mt-2">
              <strong>Points</strong>
              <div className="d-flex align-items-center gap-2 mt-1">
                <div style={{ flex: 1 }}>
                  <ProgressBar now={pct} label={`${pct}%`} />
                </div>
                <div style={{ minWidth: 80, textAlign: "right" }}>
                  <div className="h5 mb-0">{data.points}</div>
                  <div className="small text-soft">Level {data.level}</div>
                </div>
              </div>
              <div className="small text-soft mt-1">
                {currentLevelPoints}/{perLevel} pts to next level
              </div>
            </div>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="bg-dark text-white shadow-sm p-3">
            <h5 className="mb-2">🎖 Badges</h5>
            <div className="d-flex flex-wrap gap-2">
              {(data.badges && data.badges.length > 0 ? data.badges : [
                { id: "b-1", name: "Getting Started", desc: "Completed first reading" },
                { id: "b-2", name: "Consistency", desc: "3-day streak" },
              ]).map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.04)",
                    minWidth: 140,
                  }}
                >
                  <div className="fw-bold">{b.name}</div>
                  <div className="small text-soft">{b.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={8}>
          <Card className="bg-dark text-white shadow-sm p-3 mb-3">
            <h5 className="mb-2">🎯 Tasks & Activities</h5>
            <div className="small text-soft mb-3">
              Complete small activities to earn points and badges.
            </div>

            {localTasks.map((t) => (
              <div
                key={t.id}
                className="d-flex align-items-center justify-content-between mb-2"
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.03)",
                  background: t.done ? "rgba(76, 175, 80, 0.06)" : "transparent",
                }}
              >
                <div>
                  <div className="fw-bold">{t.title}</div>
                  <div className="small text-soft">{t.hint}</div>
                </div>
                <div className="text-end">
                  <div className="small text-soft mb-1">{t.pts} pts</div>
                  <Button
                    size="sm"
                    variant={t.done ? "outline-secondary" : "success"}
                    onClick={() => !t.done && claimTask(t.id)}
                    disabled={t.done}
                  >
                    {t.done ? "Done" : "Claim"}
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-2 small text-soft">
              Tip: tasks are local by default. Hook up your backend to `/patients/:id/gamification` for persistent progress.
            </div>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="bg-dark text-white shadow-sm p-3 mb-3">
            <h5 className="mb-2">Rewards Store</h5>
            <div className="small text-soft mb-3">
              Spend points on simple rewards or printable certificates.
            </div>

            <div className="d-flex flex-column gap-2">
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.03)"
              }}>
                <div>
                  <div className="fw-bold">Printable Care Certificate</div>
                  <div className="small text-soft">A friendly certificate for your pregnancy log</div>
                </div>
                <div className="text-end">
                  <div className="small text-soft">50 pts</div>
                  <Button size="sm" variant="outline-info" disabled={data.points < 50}>
                    Redeem
                  </Button>
                </div>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.03)"
              }}>
                <div>
                  <div className="fw-bold">Wellness Tips Pack</div>
                  <div className="small text-soft">Extra care tips PDF</div>
                </div>
                <div className="text-end">
                  <div className="small text-soft">20 pts</div>
                  <Button size="sm" variant="outline-info" disabled={data.points < 20}>
                    Redeem
                  </Button>
                </div>
              </div>
            </div>

          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default GamificationPage;
