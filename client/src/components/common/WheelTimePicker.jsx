import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * WheelTimePicker - iOS / Android alarm clock style tumbling wheel time picker.
 *
 * Displays a drum-style sliding wheel:
 *   [ prev hour ]       [ prev minute ]
 *   [ HOUR ]       :    [ MINUTE ]
 *   [ next hour ]       [ next minute ]
 *
 * Supports:
 * - Vertical drag / slide (pointer events)
 * - Mouse wheel scrolling
 * - Direct clicking on previous / next digits
 * - Smooth step animation and looping (00-23 hours, 00-59 minutes)
 */
const WheelTimePicker = ({
  value = '00:00',
  onChange,
  disabled = false,
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse HH:mm
  const parseVal = (str) => {
    const parts = String(str || '00:00').split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h) || h < 0 || h > 23) h = 0;
    if (isNaN(m) || m < 0 || m > 59) m = 0;
    return { hour: h, minute: m };
  };

  const { hour, minute } = parseVal(value);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isOpen]);

  const updateTime = useCallback((newH, newM) => {
    const validH = (newH + 24) % 24;
    const validM = (newM + 60) % 60;
    const formatted = `${String(validH).padStart(2, '0')}:${String(validM).padStart(2, '0')}`;
    if (onChange) onChange(formatted);
  }, [onChange]);

  // Drum column component with drag and wheel
  const DrumColumn = ({ current, max, onChangeVal }) => {
    const dragStartY = useRef(null);
    const accumulatedDelta = useRef(0);

    const prevVal = (current - 1 + max) % max;
    const nextVal = (current + 1) % max;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) {
        onChangeVal((current + 1) % max);
      } else if (e.deltaY < 0) {
        onChangeVal((current - 1 + max) % max);
      }
    };

    const handlePointerDown = (e) => {
      dragStartY.current = e.clientY;
      accumulatedDelta.current = 0;
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
      if (dragStartY.current === null) return;
      const delta = dragStartY.current - e.clientY;
      // Step every 24px of drag
      const threshold = 24;
      if (Math.abs(delta) >= threshold) {
        const steps = Math.trunc(delta / threshold);
        onChangeVal((current + steps + max * 10) % max);
        dragStartY.current = e.clientY;
      }
    };

    const handlePointerUp = () => {
      dragStartY.current = null;
    };

    return (
      <div
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          cursor: 'grab',
          touchAction: 'none',
          padding: '0.25rem 0.75rem',
          minWidth: '70px'
        }}
      >
        {/* Previous number */}
        <div
          onClick={() => onChangeVal(prevVal)}
          style={{
            fontSize: '1.4rem',
            color: 'rgba(255, 255, 255, 0.28)',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.2rem 0',
            transition: 'color 0.15s ease',
            fontFamily: 'monospace'
          }}
          title="Click to decrement"
        >
          {String(prevVal).padStart(2, '0')}
        </div>

        {/* Selected current number */}
        <div
          style={{
            fontSize: '2.5rem',
            color: '#FFFFFF',
            fontWeight: 700,
            padding: '0.1rem 0',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}
        >
          {String(current).padStart(2, '0')}
        </div>

        {/* Next number */}
        <div
          onClick={() => onChangeVal(nextVal)}
          style={{
            fontSize: '1.4rem',
            color: 'rgba(255, 255, 255, 0.28)',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0.2rem 0',
            transition: 'color 0.15s ease',
            fontFamily: 'monospace'
          }}
          title="Click to increment"
        >
          {String(nextVal).padStart(2, '0')}
        </div>
      </div>
    );
  };

  const displayTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button that looks like a clean form input */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={className || 'search-input'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0.55rem 0.85rem',
          textAlign: 'left',
          background: 'var(--bg-input, #121824)',
          border: isOpen ? '1px solid var(--accent-gold, #D9BF8C)' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          borderRadius: '8px',
          color: 'var(--text-main, #FFFFFF)',
          boxShadow: isOpen ? '0 0 0 2px rgba(217, 191, 140, 0.25)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s'
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 600 }}>
          {displayTime}
        </span>
        <i
          className="fa-regular fa-clock"
          style={{
            color: isOpen ? 'var(--accent-gold, #D9BF8C)' : 'var(--text-muted, #8A8478)',
            fontSize: '0.9rem'
          }}
        ></i>
      </button>

      {/* Floating Alarm-Style Wheel Picker Popover */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: '#000000',
            border: '1px solid rgba(217, 191, 140, 0.4)',
            borderRadius: '12px',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.05)',
            padding: '1rem 1.25rem 0.75rem',
            width: '240px',
            maxWidth: '90vw'
          }}
        >
          {/* Header indicator */}
          <div style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '0.5rem',
            fontWeight: 600
          }}>
            Scroll or slide to set time
          </div>

          {/* The Drum Wheel exactly matching user reference image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000000',
              padding: '0.5rem 0',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {/* Hours Column */}
            <DrumColumn
              current={hour}
              max={24}
              onChangeVal={(newH) => updateTime(newH, minute)}
            />

            {/* Colon Separator */}
            <div
              style={{
                fontSize: '2rem',
                color: '#FFFFFF',
                fontWeight: 700,
                padding: '0 0.25rem',
                userSelect: 'none'
              }}
            >
              :
            </div>

            {/* Minutes Column */}
            <DrumColumn
              current={minute}
              max={60}
              onChangeVal={(newM) => updateTime(hour, newM)}
            />
          </div>

          {/* Footer Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => updateTime(0, 0)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: '4px',
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
                title="Set 00:00"
              >
                00:00
              </button>
              <button
                type="button"
                onClick={() => updateTime(23, 59)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: '4px',
                  padding: '0.2rem 0.45rem',
                  fontSize: '0.68rem',
                  cursor: 'pointer'
                }}
                title="Set 23:59"
              >
                23:59
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--accent-gold, #D9BF8C)',
                border: 'none',
                color: '#121824',
                fontWeight: 700,
                borderRadius: '6px',
                padding: '0.25rem 0.8rem',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelTimePicker;

