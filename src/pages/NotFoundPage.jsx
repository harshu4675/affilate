import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState.jsx';

export function NotFoundPage() {
  return (
    <div className="page-empty">
      <EmptyState
        icon="box"
        title="Page not found"
        message="The page you are looking for does not exist."
        action={
          <Link to="/" className="btn btn-primary">
            Back to Talishh
          </Link>
        }
      />
    </div>
  );
}
