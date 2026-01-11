import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="page">
      <section className="app__card app__card--form">
        <div className="card__header">
          <div>
            <h2>Page not found</h2>
            <p>We could not find that route.</p>
          </div>
          <div className="card__pill">404</div>
        </div>
        <div className="placeholder">
          <p>Return to the Start page to continue.</p>
          <Link to="/" className="ghost-link">
            Go to Start
          </Link>
        </div>
      </section>
    </div>
  )
}

export default NotFoundPage
