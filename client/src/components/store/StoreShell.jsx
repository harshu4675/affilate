import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { TalishhLogo } from './TalishhLogo.jsx';
import { Icon } from '../icons/Icons.jsx';
import { BRAND } from '../../constants/brand.js';

export function StoreShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isHome = location.pathname === '/';
  const [term, setTerm] = useState(() => searchParams.get('q') || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isHome) setTerm(searchParams.get('q') || '');
  }, [isHome, searchParams]);

  const submit = (event) => {
    event.preventDefault();
    const value = term.trim();
    navigate(value ? `/?q=${encodeURIComponent(value)}` : '/');
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div className="store">
      <header className="store-header">
        <div className="store-header-inner">
          <Link to="/" className="store-brand" aria-label={`${BRAND.name} home`}>
            <TalishhLogo />
          </Link>
          <form className="store-search" role="search" onSubmit={submit}>
            <Icon name="search" size={16} />
            <input
              ref={inputRef}
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search products, brands and stores"
              aria-label="Search products"
              enterKeyHint="search"
            />
            {term && (
              <button type="button" className="store-search-clear" aria-label="Clear search" onClick={() => setTerm('')}>
                <Icon name="close" size={14} />
              </button>
            )}
          </form>
          {!isHome && (
            <Link to="/" className="store-header-back">
              <Icon name="arrowLeft" size={15} />
              <span>All products</span>
            </Link>
          )}
        </div>
      </header>

      <main className="store-main">
        <Outlet />
      </main>
    </div>
  );
}
