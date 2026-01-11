function AboutPage() {
  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>About</h2>
            <p>Operational tooling for LoRaWAN log inspection and replay.</p>
          </div>
          <div className="card__pill">Info</div>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <h3>What it does</h3>
            <p className="info-copy">
              Smart Parks LP0 turns stored JSONL uplink logs into structured insight.
              Use it to scan, decrypt, decode, and replay traffic while keeping an
              audit trail of actions and results.
            </p>
          </div>
          <div className="info-card">
            <h3>Core workflows</h3>
            <ul className="info-list">
              <li>Scan logs to discover gateways and devices.</li>
              <li>Manage device session keys by DevAddr.</li>
              <li>Run decoders against decrypted payloads.</li>
              <li>Replay uplinks to a UDP forwarder target.</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>Security &amp; roles</h3>
            <ul className="info-list">
              <li>JWT authentication with admin, editor, and viewer roles.</li>
              <li>Uploads are restricted to JSONL logs and size limits.</li>
              <li>Uploaded decoders are sandboxed and file-type checked.</li>
            </ul>
          </div>
        </div>
        <div className="info-card">
          <h3>Storage &amp; retention</h3>
          <p className="info-copy">
            Local installs store data under the configured data directory
            (default <span className="mono">/data</span>). Server mode uses the
            database for metadata plus the same storage layout for files and decoders.
            Review retention needs before moving to production.
          </p>
        </div>
      </section>
    </div>
  )
}

export default AboutPage
