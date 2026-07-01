'use client';

import { space } from '@classess/config';
import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react';
import { FOCUSABLE, useClssStyles } from './internal/styles';

export interface TabItem {
  value: string;
  label: string;
  content?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Names the tablist for assistive tech. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Tabs — an ARIA tablist with roving tabindex and full keyboard support (Arrow keys, Home, End).
 * The active tab carries a hairline underline that wipes in (selection is the meaning). The active
 * panel is the only one rendered.
 */
export function Tabs({ items, value, onChange, 'aria-label': ariaLabel, className }: TabsProps) {
  useClssStyles();
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.map((t, i) => ({ t, i })).filter(({ t }) => !t.disabled);
    if (enabled.length === 0) return;
    const currentPos = enabled.findIndex(({ t }) => t.value === value);
    let nextPos = currentPos;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextPos = (currentPos + 1) % enabled.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextPos = (currentPos - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        nextPos = 0;
        break;
      case 'End':
        nextPos = enabled.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const target = enabled[nextPos];
    if (!target) return;
    onChange(target.t.value);
    tabRefs.current[target.i]?.focus();
  };

  const active = items.find((t) => t.value === value) ?? items[0];

  return (
    <div className={className}>
      <div role="tablist" aria-label={ariaLabel} className="clss-tabs__list" onKeyDown={move}>
        {items.map((tab, i) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className={['clss-tab', FOCUSABLE].join(' ')}
              onClick={() => !tab.disabled && onChange(tab.value)}
            >
              {tab.label}
              <span className="clss-tab__ink" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {active && active.content != null && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${active.value}`}
          aria-labelledby={`${baseId}-tab-${active.value}`}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a tabpanel is intentionally focusable (WAI-ARIA) since its content may hold no focusable element.
          tabIndex={0}
          className={FOCUSABLE}
          style={{ paddingTop: space[2] }}
        >
          {active.content}
        </div>
      )}
    </div>
  );
}
