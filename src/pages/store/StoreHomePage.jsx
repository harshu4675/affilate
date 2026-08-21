import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton } from '../../components/store/ProductCard.jsx';
import { RedirectOverlay } from '../../components/store/RedirectOverlay.jsx';
import { Icon } from '../../components/icons/Icons.jsx';
import { usePurchase } from '../../hooks/usePurchase.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { fetchStoreProducts } from '../../services/catalogApi.js';
import { BRAND, STORE_PRICE_RANGES, STORE_SORT_OPTIONS } from '../../constants/brand.js';

const PAGE_SIZE = 24;

export function StoreHomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const debouncedQuery = useDebounce(query, 250);

  const [store, setStore] = useState('');
  const [category, setCategory] = useState('');
  const [priceRange, setPriceRange] = useState('any');
  const [sort, setSort] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState({ stores: [], categories: [] });
  const [total, setTotal] = useState(0);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const { purchaseState, buy, reset } = usePurchase();

  const range = useMemo(
    () => STORE_PRICE_RANGES.find((item) => item.id === priceRange) || STORE_PRICE_RANGES[0],
    [priceRange]
  );

  const baseParams = useMemo(
    () => ({
      q: debouncedQuery,
      store,
      category,
      minPrice: range.min,
      maxPrice: range.max,
      sort,
      limit: PAGE_SIZE
    }),
    [debouncedQuery, store, category, range, sort]
  );

  const load = useCallback(
    async (offset) => {
      const ticket = ++requestRef.current;
      if (offset === 0) {
        setStatus((prev) => (prev === 'ready' ? 'refreshing' : 'loading'));
      } else {
        setLoadingMore(true);
      }
      try {
        const data = await fetchStoreProducts({ ...baseParams, offset });
        if (ticket !== requestRef.current) return;
        setProducts((prev) => (offset === 0 ? data.products : [...prev, ...data.products]));
        setFacets(data.facets || { stores: [], categories: [] });
        setTotal(data.total);
        setCatalogTotal(data.catalogTotal);
        setHasMore(data.hasMore);
        setError('');
        setStatus('ready');
      } catch (err) {
        if (ticket !== requestRef.current) return;
        setError((err && err.message) || 'Products could not be loaded.');
        setStatus('error');
      } finally {
        if (ticket === requestRef.current) setLoadingMore(false);
      }
    },
    [baseParams]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const activeFilters = (store ? 1 : 0) + (category ? 1 : 0) + (priceRange !== 'any' ? 1 : 0);

  const clearAll = () => {
    setStore('');
    setCategory('');
    setPriceRange('any');
    setSort('newest');
    setSearchParams({}, { replace: true });
  };

  const showSkeletons = status === 'loading';
  const isEmpty = status === 'ready' && products.length === 0;

  return (
    <div className="store-home">
      {catalogTotal > 0 && !query && (
        <section className="store-hero">
          <h1 className="store-hero-title">Shop the best picks on {BRAND.name}</h1>
          <p className="store-hero-sub">{BRAND.tagline}</p>
        </section>
      )}

      <div className="store-controls">
        <div className="store-controls-main">
          <div className="store-result-count">
            {status === 'loading' ? (
              <span className="skeleton-line skeleton-line-sm" />
            ) : (
              <>
                <strong>{total}</strong> {total === 1 ? 'product' : 'products'}
                {query && <span className="store-result-query"> for “{query}”</span>}
              </>
            )}
          </div>
          <div className="store-controls-actions">
            <button
              type="button"
              className={`store-filter-toggle${activeFilters > 0 ? ' store-filter-toggle-active' : ''}`}
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
            >
              <Icon name="filter" size={15} />
              <span>Filters</span>
              {activeFilters > 0 && <span className="store-filter-count">{activeFilters}</span>}
            </button>
            <label className="store-sort">
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                {STORE_SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Icon name="chevronDown" size={14} />
            </label>
          </div>
        </div>

        {filtersOpen && (
          <div className="store-filters">
            <label className="store-filter-field">
              <span>Store</span>
              <select value={store} onChange={(event) => setStore(event.target.value)}>
                <option value="">All stores</option>
                {facets.stores.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </select>
            </label>
            {facets.categories.length > 0 && (
              <label className="store-filter-field">
                <span>Category</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All categories</option>
                  {facets.categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({item.count})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="store-filter-field">
              <span>Price</span>
              <select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}>
                {STORE_PRICE_RANGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {(activeFilters > 0 || query) && (
              <button type="button" className="store-filter-clear" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="store-state store-state-error">
          <Icon name="alertCircle" size={22} />
          <h2>We could not load products</h2>
          <p>{error}</p>
          <button type="button" className="store-primary-btn" onClick={() => load(0)}>
            Try again
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="store-state">
          <Icon name={catalogTotal === 0 ? 'box' : 'search'} size={22} />
          <h2>{catalogTotal === 0 ? `${BRAND.name} is getting stocked` : 'No products match your search'}</h2>
          <p>
            {catalogTotal === 0
              ? 'New products are on the way. Please check back shortly.'
              : 'Try a different search term or clear the filters to see everything.'}
          </p>
          {catalogTotal > 0 && (
            <button type="button" className="store-primary-btn" onClick={clearAll}>
              Clear search and filters
            </button>
          )}
        </div>
      )}

      {(showSkeletons || products.length > 0) && (
        <div className={`product-grid${status === 'refreshing' ? ' product-grid-refreshing' : ''}`}>
          {showSkeletons
            ? Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={`skeleton-${index}`} />)
            : products.map((product, index) => (
                <ProductCard key={product.id} product={product} onBuy={buy} eager={index < 6} />
              ))}
        </div>
      )}

      {hasMore && status === 'ready' && (
        <div className="store-load-more">
          <button type="button" className="store-secondary-btn" onClick={() => load(products.length)} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more products'}
          </button>
        </div>
      )}

      <RedirectOverlay state={purchaseState} onClose={reset} />
    </div>
  );
}
