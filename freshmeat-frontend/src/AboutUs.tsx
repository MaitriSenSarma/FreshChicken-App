import "./AboutUs.css";

export default function AboutUs() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <h1>About Us</h1>
          <p className="hero-subtitle">
            Honoring Our Past, Cultivating Our Future
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="about-section">
        <div className="container">
          <h2>Our Story</h2>

          <p>
            Founded with a clear vision to transform the way poultry is raised
            and brought to your table, Freshca began with a simple belief:
            better care leads to better food. What started as a passion for
            ethical, transparent farming has grown into a dedicated startup
            committed to raising healthy flocks and delivering fresh, wholesome
            poultry products to our community. Every step of our journey is
            rooted in respect for the land, our animals, and the families who
            trust us to nourish them.
          </p>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="about-section light">
        <div className="container">
          <h2>Our Mission &amp; Values</h2>

          <p>
            We are committed to sustainable farming practices, ethical animal
            welfare, and complete transparency from farm to table.
          </p>

          <div className="value-grid">
            <div className="value-card">
              <h3>Ethical Animal Welfare</h3>

              <p>
                Our chickens are raised in clean, stress-free environments with
                plenty of room to roam, fresh air, and nutrient-rich feed—never
                subjected to unnecessary antibiotics or artificial hormones.
              </p>
            </div>

            <div className="value-card">
              <h3>Sustainable Farming Practices</h3>

              <p>
                We prioritize responsible land management and eco-friendly
                operations that protect local ecosystems and build a healthier
                future for agriculture.
              </p>
            </div>

            <div className="value-card">
              <h3>Community Connection</h3>

              <p>
                As a locally driven startup, we believe in building lasting
                relationships with our customers, local partners, and neighbors
                through honesty, reliability, and unmatched quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="about-section">
        <div className="container">
          <h2>What We Offer</h2>

          <div className="offer-card">
            <h3>Pasture-Raised Chicken</h3>

            <p>
              Tender, flavorful poultry raised naturally for superior taste and
              nutrition.
            </p>
          </div>

          <div className="offer-card">
            <h3>Custom &amp; Wholesale Supply</h3>

            <p>
              Reliable, fresh-from-the-farm deliveries tailored for households,
              local restaurants, and specialty grocers.
            </p>
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="about-section light">
        <div className="container">
          <h2>Meet the Founders</h2>

          <p>
            Behind Freshca is <strong>Michael Roy</strong>,{" "}
            <strong>Asit Roy</strong> and{" "}
            <strong>Maitri Sen Sarma</strong> whose hands-on dedication to
            agriculture and quality food sparked this venture. Driven by a
            desire to bring integrity back to poultry farming, we oversee every
            detail of our operations to ensure that what reaches your kitchen
            meets the highest standards of freshness and care.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="container">
          <h2>Join Our Journey</h2>

          <p>
            We invite you to experience the difference that genuine care makes.
            Follow our progress, explore our products, and become part of a
            community that values real, responsibly raised food.
          </p>

          <a href="/" className="shop-btn">
            Shop Now
          </a>
        </div>
      </section>
    </div>
  );
}