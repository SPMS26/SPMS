import React, { useState } from 'react';

const initialsOf = (name) => (name || '')
  .trim()
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => Array.from(word)[0].toUpperCase())
  .join('') || '?';

// The user's photo, or their initials drawn here so no name leaves the app
const UserAvatar = ({ user, size = 36, style }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const box = { width: `${size}px`, height: `${size}px`, ...style };

  if (user?.profile_image && !photoFailed) {
    return <img src={user.profile_image} alt="Avatar" className="user-avatar" style={box} onError={() => setPhotoFailed(true)} />;
  }
  return (
    <span className="user-avatar user-avatar-initials" role="img" aria-label="Avatar" style={{ ...box, fontSize: `${Math.round(size * 0.4)}px` }}>
      {initialsOf(user?.full_name)}
    </span>
  );
};

export default UserAvatar;
