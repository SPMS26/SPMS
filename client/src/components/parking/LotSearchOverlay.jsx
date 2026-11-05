import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import NoResults from '../common/NoResults';
import { lotIconClass, lotPriceLabel } from './LotCard';
import { matchesSearch } from '../../utils/searchUtils';

// Full-screen search: blurs the page and lists lots. Rendered on <body> so the header's
// backdrop-filter cannot trap it inside the header.
const LotSearchOverlay = ({ lots, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const results = lots.filter((lot) => matchesSearch(query, [lot.name, lot.address, lot.owner_name]));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // On the window, because focus leaves the panel when the Clear search button disappears
  useEffect(() => {
    const onEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [onClose]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pickLot = (lot) => {
    onClose();
    onSelect(lot);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pickLot(results[active]);
    }
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return createPortal(
    <div
      className="lot-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Search parking lots"
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lot-search-panel">
        <div className="lot-search-field">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            autoFocus
            ref={inputRef}
            type="text"
            placeholder="Search lots by name or location"
            aria-label="Search lots by name or location"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="lot-search-close" aria-label="Close search" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {results.length === 0 ? (
          lots.length > 0
            ? <NoResults query={query} onClear={clearQuery} />
            : <p className="lot-search-empty">No parking lots available yet.</p>
        ) : (
          <div className="lot-search-results" ref={listRef}>
            {results.map((lot, index) => (
              <button
                type="button"
                key={lot.id}
                className={`lot-search-result ${index === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => pickLot(lot)}
              >
                <span className="lot-search-icon"><i className={`fa-solid ${lotIconClass(lot.name)}`}></i></span>
                <span className="lot-search-text">
                  <strong>{lot.name}</strong>
                  <span>{lot.address || 'Location not set'}</span>
                </span>
                <span className="lot-search-meta">
                  <strong>{lot.available_slots} free</strong>
                  <span>{lotPriceLabel(lot)}</span>
                </span>
                <i className="fa-solid fa-chevron-right lot-search-chevron"></i>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default LotSearchOverlay;
