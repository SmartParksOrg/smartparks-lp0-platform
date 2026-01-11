function IntegrationsPage() {
  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Integrations</h2>
            <p>Configure outbound connectors and automation targets.</p>
          </div>
          <div className="card__pill">MVP</div>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <h3>Current workflow</h3>
            <ul className="info-list">
              <li>Upload or generate JSONL logs in Files.</li>
              <li>Scan to discover gateways and DevAddrs.</li>
              <li>Decode or Replay from Start using the scan token.</li>
              <li>Export results as CSV or JSON.</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Planned connectors</h3>
            <ul className="info-list">
              <li>HTTP webhooks for decode and replay events.</li>
              <li>Object storage export (S3-compatible buckets).</li>
              <li>MQTT bridge for downstream pipelines.</li>
              <li>Alerting hooks (Slack, Teams, email).</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Event scope</h3>
            <p className="info-copy">
              Integrations will emit normalized events for scan summaries, decode
              results, and replay status. Each event includes metadata, timestamps,
              and source file references to make downstream traceability easy.
            </p>
          </div>
        </div>
        <div className="placeholder">
          <p>
            Need a specific connector? Capture the requirement in the build plan
            before implementation so we can keep parity with V1 while adding new
            destinations safely.
          </p>
        </div>
      </section>
    </div>
  )
}

export default IntegrationsPage
