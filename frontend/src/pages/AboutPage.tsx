function AboutPage() {
  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>About</h2>
            <p>Smart Parks LP0 platform overview.</p>
          </div>
          <div className="card__pill">Info</div>
        </div>
        <div className="placeholder">
          <p>
            Smart Parks LP0 helps teams inspect, decrypt, decode, and replay LoRaWAN
            uplinks from JSONL logs. This space will expand with release notes and
            support resources.
          </p>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
