'use client';

import { accent, hairline, ink, paper, radius, space, typeScale, zIndex } from '@classess/config';
import type { Sdk } from '@classess/sdk';
import type { VidyaTurn } from '@classess/vidya';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Create } from '../screens/Create';
import { LearnScreen } from '../screens/LearnScreen';
import { Onboarding } from '../screens/Onboarding';
import { Parent } from '../screens/Parent';
import { Plans } from '../screens/Plans';
import { PracticeScreen } from '../screens/PracticeScreen';
import { Progress } from '../screens/Progress';
import { Settings } from '../screens/Settings';
import { Today } from '../screens/Today';
import { LivingVidya } from '../vidya/LivingVidya';
import { ConversionSheet, MeterSheet } from './overlays';
import { type Route, useRouter } from './router';
import { ShellProvider } from './shell-context';
import { useViewport } from './useViewport';

const MOLTEN = accent.molten;
const TAB_ROOTS = new Set<Route['name']>(['today', 'progress', 'create', 'settings']);

const ROUTE_TITLE: Record<Route['name'], string> = {
  onboarding: 'Welcome',
  today: 'Today',
  learn: 'Learn',
  practice: 'Practice',
  create: 'Create',
  progress: 'Progress',
  settings: 'Settings',
  parent: 'Parent',
  plans: 'Superstar',
};

function renderRoute(route: Route, sdk: Sdk, onAsk: (text: string) => void): ReactNode {
  switch (route.name) {
    case 'onboarding':
      return <Onboarding sdk={sdk} step={route.step} />;
    case 'today':
      return <Today />;
    case 'progress':
      return <Progress sdk={sdk} />;
    case 'create':
      return <Create sdk={sdk} />;
    case 'settings':
      return <Settings />;
    case 'parent':
      return <Parent sdk={sdk} />;
    case 'plans':
      return <Plans />;
    case 'learn':
      return <LearnScreen sdk={sdk} nodeId={route.nodeId} onAsk={onAsk} />;
    case 'practice':
      return <PracticeScreen sdk={sdk} />;
  }
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11 3L5 9l6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopBar({ route }: { route: Route }) {
  const router = useRouter();
  const isRoot = TAB_ROOTS.has(route.name);
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space[2],
        height: 56,
        padding: `0 ${space[3]}px`,
        borderBottom: `1px solid ${hairline.onPaper}`,
        background: paper,
      }}
    >
      {!isRoot && router.canGoBack ? (
        <button
          type="button"
          onClick={router.back}
          aria-label="Back"
          style={{
            display: 'inline-flex',
            border: 0,
            background: 'transparent',
            color: ink[700],
            cursor: 'pointer',
            padding: space.half,
            marginLeft: -space.half,
          }}
        >
          <BackIcon />
        </button>
      ) : (
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: MOLTEN }} />
      )}
      <span style={{ fontSize: typeScale.h3.size, fontWeight: 600, color: ink[900] }}>
        {isRoot ? 'Classess' : ROUTE_TITLE[route.name]}
      </span>
    </header>
  );
}

interface Tab {
  name: Extract<Route['name'], 'today' | 'progress' | 'create' | 'settings'>;
  label: string;
  icon: ReactNode;
}

function TabIcon({ name }: { name: Tab['name'] }) {
  const s = {
    width: 22,
    height: 22,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (name === 'today')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...s}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6 9.5V20h12V9.5" />
      </svg>
    );
  if (name === 'progress')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...s}>
        <circle cx="6" cy="7" r="1.6" />
        <circle cx="17" cy="6" r="1.6" />
        <circle cx="12" cy="14" r="1.6" />
        <circle cx="18" cy="17" r="1.6" />
        <path d="M7.4 7.6 10.6 13M13.4 13.2 16.6 16M7.6 7 15.4 6.3" />
      </svg>
    );
  if (name === 'create')
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...s}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...s}>
      <path d="M6 8h12M6 12h12M6 16h12" />
      <circle cx="9" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

const TABS: Tab[] = [
  { name: 'today', label: 'Today', icon: null },
  { name: 'progress', label: 'Progress', icon: null },
  { name: 'create', label: 'Create', icon: null },
  { name: 'settings', label: 'You', icon: null },
];

function BottomNav({ route }: { route: Route }) {
  const router = useRouter();
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: zIndex.canvas,
        display: 'grid',
        gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
        maxWidth: 560,
        margin: '0 auto',
        borderTop: `1px solid ${hairline.onPaper}`,
        background: paper,
        // Vidya docks bottom-right; keep the last tab clear of her.
        paddingRight: 64,
      }}
    >
      {TABS.map((tab) => {
        const active = route.name === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => router.navigate({ name: tab.name })}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: `${space[1]}px 0 ${space[2]}px`,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: active ? ink[900] : ink[500],
              transition: 'color 160ms',
            }}
          >
            <span style={{ position: 'relative' }}>
              <TabIcon name={tab.name} />
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: -6,
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: MOLTEN,
                  }}
                />
              )}
            </span>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Desktop side rail — the web-app primary nav (replaces the mobile bottom bar above the breakpoint). */
function SideNav({ route }: { route: Route }) {
  const router = useRouter();
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100dvh',
        width: 236,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: space.half,
        padding: space[3],
        borderRight: `1px solid ${hairline.onPaper}`,
        background: paper,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: space[1], marginBottom: space[3] }}>
        <span
          aria-hidden
          style={{ width: 10, height: 10, borderRadius: 999, background: MOLTEN }}
        />
        <span style={{ fontSize: typeScale.h3.size, fontWeight: 600, color: ink[900] }}>
          Classess
        </span>
      </div>
      {TABS.map((tab) => {
        const active = route.name === tab.name;
        return (
          <button
            key={tab.name}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => router.navigate({ name: tab.name })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space[2],
              padding: `${space[1]}px ${space[2]}px`,
              borderRadius: radius.md,
              border: 0,
              cursor: 'pointer',
              textAlign: 'left',
              background: active ? ink[100] : 'transparent',
              color: active ? ink[900] : ink[500],
              fontWeight: active ? 600 : 400,
              fontSize: typeScale.body.size,
              transition: 'background 160ms, color 160ms',
            }}
          >
            <TabIcon name={tab.name} />
            <span>{tab.label}</span>
            {active && (
              <span
                aria-hidden
                style={{
                  marginLeft: 'auto',
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: MOLTEN,
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** A slim desktop header carrying back + title on non-root routes (root routes lead with their own h1). */
function ContextHeader({ route }: { route: Route }) {
  const router = useRouter();
  if (TAB_ROOTS.has(route.name)) return null;
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space[2],
        height: 56,
        padding: `0 ${space[4]}px`,
        borderBottom: `1px solid ${hairline.onPaper}`,
        background: paper,
      }}
    >
      {router.canGoBack && (
        <button
          type="button"
          onClick={router.back}
          aria-label="Back"
          style={{
            display: 'inline-flex',
            border: 0,
            background: 'transparent',
            color: ink[700],
            cursor: 'pointer',
            padding: space.half,
            marginLeft: -space.half,
          }}
        >
          <BackIcon />
        </button>
      )}
      <span style={{ fontSize: typeScale.h3.size, fontWeight: 600, color: ink[900] }}>
        {ROUTE_TITLE[route.name]}
      </span>
    </header>
  );
}

export function AppShell({
  sdk,
  turns,
  onAsk,
}: {
  sdk: Sdk;
  turns: VidyaTurn[];
  onAsk: (text: string) => void;
}) {
  const router = useRouter();
  const route = router.route;
  const { isDesktop } = useViewport();
  const [meterOpen, setMeterOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);

  const shellApi = useMemo(
    () => ({ openMeter: () => setMeterOpen(true), openConversion: () => setConversionOpen(true) }),
    [],
  );

  // Onboarding and the learn/practice loops run full-focus (no chrome competing for attention).
  const immersive =
    route.name === 'onboarding' || route.name === 'learn' || route.name === 'practice';

  const body = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
      {renderRoute(route, sdk, onAsk)}
    </div>
  );

  return (
    <ShellProvider value={shellApi}>
      {isDesktop && !immersive ? (
        // Desktop: a real web layout — persistent side rail + wide content.
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'row' }}>
          <SideNav route={route} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <ContextHeader route={route} />
            {body}
          </div>
        </div>
      ) : (
        // Mobile / immersive: single column with a bottom nav (hidden on immersive flows).
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
          {!immersive && <TopBar route={route} />}
          {body}
          {!immersive && <BottomNav route={route} />}
        </div>
      )}

      <LivingVidya turns={turns} onSend={onAsk} entranceKey={route.name} />
      <MeterSheet open={meterOpen} onClose={() => setMeterOpen(false)} />
      <ConversionSheet
        open={conversionOpen}
        onClose={() => setConversionOpen(false)}
        onSeePlans={() => {
          setConversionOpen(false);
          router.navigate({ name: 'plans' });
        }}
      />
    </ShellProvider>
  );
}
