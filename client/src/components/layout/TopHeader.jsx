import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from '../common/UserAvatar';

const TopHeader = ({ onToggleSidebar, sidebarOpen, search }) => {
  const { user, isAdmin, isSecurity } = useAuth();
  const location = useLocation();

  const isProfilePage = location.pathname === '/profile';
  const homePath = isSecurity ? '/admin/scanner' : (isAdmin ? '/admin' : '/dashboard');

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="nav-icon-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
        >
          <i className="fa-solid fa-bars"></i>
        </button>

        {isProfilePage && (
          <Link to={homePath} className="nav-arrow-btn">
            <i className="fa-solid fa-arrow-left"></i> Back
          </Link>
        )}

        {search && (
          <div className="search-box" role="search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              autoComplete="off"
              {...(search.onOpen
                ? { readOnly: true, value: '', onClick: search.onOpen, onFocus: search.onOpen, style: { cursor: 'pointer' } }
                : {
                    value: search.value,
                    onChange: (e) => search.onChange(e.target.value),
                    onKeyDown: (e) => e.key === 'Escape' && search.onChange('')
                  })}
            />
            {search.value && (
              <button type="button" className="search-clear" aria-label="Clear search" onClick={() => search.onChange('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="header-right">
        <Link to="/profile" className="user-profile" title="Your profile">
          <UserAvatar user={user} size={32} />
          <div className="user-info">
            <h5>{user ? user.full_name : 'User'}</h5>
            {isAdmin && <p>{user?.role === 'SECURITY' ? 'Gate security' : (user?.organization_name || 'Lot owner')}</p>}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default TopHeader;
