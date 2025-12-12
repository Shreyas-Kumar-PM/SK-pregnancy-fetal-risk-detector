import React, { useEffect, useState } from "react";
import { Row, Col, Card, Button, Table, Spinner } from "react-bootstrap";
import { getGamification, recordActivity, claimReward } from "../api/gamificationApi";

const rewardsCatalog = [
  { id: "coupon_50", title: "50% Discount Coupon", cost: 100, description: "Redeem for clinic partner discount." },
  { id: "counsel_1", title: "1:1 Counseling Session", cost: 200, description: "Book a short counseling session." },
];

const GamificationPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getGamification();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleClaim = async (rewardId) => {
    setError(null);
    setClaiming(true);
    try {
      const res = await claimReward(rewardId);
      if (res.data && res.data.success) {
        await load();
        alert(res.data.message || "Reward claimed!");
      } else if (res.data && res.data.error) {
        alert(res.data.error);
      } else {
        await load();
      }
    } catch (err) {
      console.error("Claim failed:", err);
      setError("Could not claim reward.");
    } finally {
      setClaiming(false);
    }
  };

  const handleRecord = async () => {
    await recordActivity();
    await load();
  };

  return (
    <div className="p-3">
      <h2 className="text-white mb-3">Rewards & Streaks</h2>

      {loading ? (
        <div className="text-soft">Loading…</div>
      ) : (
        <Row>
          <Col md={6}>
            <Card className="bg-dark text-white mb-3 gamification-large">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-soft">Current streak</div>
                    <h3 className="mb-0">{data.streak_count} days</h3>
                    <div className="small text-soft mt-1">Last active: {data.last_active_at ? new Date(data.last_active_at).toLocaleString() : '—' }</div>
                  </div>

                  <div className="text-end">
                    <div className="small text-soft">Points</div>
                    <h3>{data.points}</h3>
                    <Button size="sm" onClick={handleRecord} variant="primary">Mark Today</Button>
                  </div>
                </div>

                <hr style={{ borderColor: "#2B2E31", marginTop: 16, marginBottom: 16 }} />

                <div>
                  <div className="small text-soft mb-2">Badges earned</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {data.badges.length === 0 && <div className="text-soft">No badges yet. Keep it up!</div>}
                    {data.badges.map((b) => (
                      <div key={b.id} className="badge-card p-2">
                        <div className="badge-icon">🏅</div>
                        <div>
                          <div className="fw-bold">{b.title}</div>
                          <div className="small text-soft">{b.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="bg-dark text-white mb-3">
              <Card.Body>
                <h5 className="mb-3">Rewards Catalog</h5>

                <Table responsive borderless className="text-white small">
                  <thead>
                    <tr>
                      <th>Reward</th>
                      <th>Cost</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewardsCatalog.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="fw-bold">{r.title}</div>
                          <div className="small text-soft">{r.description}</div>
                        </td>
                        <td>{r.cost}</td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            disabled={claiming || data.points < r.cost}
                            onClick={() => handleClaim(r.id)}
                          >
                            {claiming ? <Spinner animation="border" size="sm" /> : (data.points >= r.cost ? 'Claim' : 'Insufficient')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {error && <div className="text-danger small mt-2">{error}</div>}
              </Card.Body>
            </Card>

            <Card className="bg-dark text-white">
              <Card.Body>
                <h6>How to earn points</h6>
                <ul className="small text-soft">
                  <li>Open the app and mark daily activity → +10–15 points</li>
                  <li>Maintain streaks → milestone bonus points</li>
                  <li>Earn badges to unlock special offers</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default GamificationPage;
