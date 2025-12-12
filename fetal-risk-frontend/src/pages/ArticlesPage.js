// src/pages/ArticlesPage.js
import React from "react";
import { Card, Row, Col } from "react-bootstrap";

const articles = [
  {
    id: 1,
    title: "Understanding Each Trimester",
    desc: "A gentle overview of fetal and maternal changes across all trimesters.",
    img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.whattoexpect.com/pregnancy/trimester-guide/",
  },
  {
    id: 2,
    title: "Foods to Eat & Avoid During Pregnancy",
    desc: "Evidence-based nutrition guidance for a safe and healthy pregnancy.",
    img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.healthline.com/nutrition/pregnancy-foods",
  },
  {
    id: 3,
    title: "Safe Exercises for Pregnant Women",
    desc: "Staying active reduces complications. Here are doctor-recommended exercises.",
    img: "https://images.unsplash.com/photo-1594737625785-c0f4bd1f97b7?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.acog.org/womens-health/faqs/exercise-during-pregnancy",
  },
  {
    id: 4,
    title: "Managing Stress During Pregnancy",
    desc: "Your emotional wellness affects your baby — here’s how to stay calm.",
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.marchofdimes.org/find-support/topics/pregnancy/stress-and-pregnancy",
  },
  {
    id: 5,
    title: "Signs You Should Contact a Doctor",
    desc: "A simple guide to spotting early warning signs & when to seek immediate care.",
    img: "https://images.unsplash.com/photo-1503264116251-35a269479413?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.mayoclinic.org/healthy-lifestyle/pregnancy-week-by-week/in-depth/pregnancy/art-20046020",
  },
  {
    id: 6,
    title: "Preparing for Labor & Delivery",
    desc: "Learn what to expect, pain management options, and preparation tips.",
    img: "https://images.unsplash.com/photo-1533515323-7de1c7be9f23?w=1200&q=60&auto=format&fit=crop",
    link: "https://www.nhs.uk/conditions/pregnancy-and-baby/labour-and-birth/",
  },
];

const ArticlesPage = () => {
  return (
    <div className="p-3">
      <h2 className="text-white mb-4">Pregnancy Articles</h2>

      <Row xs={1} sm={2} md={3} className="g-4">
        {articles.map((a) => (
          <Col key={a.id}>
            <Card
              className="shadow-sm article-card bg-dark text-white"
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform .18s ease, box-shadow .18s ease",
              }}
              onClick={() => window.open(a.link, "_blank", "noopener")}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 30px rgba(0,0,0,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div style={{ height: 150, overflow: "hidden" }}>
                <Card.Img
                  src={a.img}
                  alt={a.title}
                  style={{
                    height: "100%",
                    width: "100%",
                    objectFit: "cover",
                    filter: "brightness(0.92)",
                  }}
                />
              </div>

              <Card.Body>
                <Card.Title
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {a.title}
                </Card.Title>

                <Card.Text
                  className="text-soft small"
                  style={{ minHeight: 50, color: "rgba(255,255,255,0.78)" }}
                >
                  {a.desc}
                </Card.Text>
              </Card.Body>

              <div
                className="px-3 py-2 small"
                style={{
                  color: "#9bdcff",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                Read more →
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ArticlesPage;
