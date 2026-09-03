/**
 * The kit — the primitives every app screen is built from, ported from design/prototypes/app-v1.html
 * (DESIGN.md is law). Import from here; the stylesheet rides along.
 *
 *   import { AppShell, TopBar, Card, Button } from '../ui/primitives';
 */

import './ui.css';

export { AllowanceCard, type AllowanceCardProps } from './AllowanceCard';
export {
  AppShell,
  type AppShellProps,
  Avatar,
  NAV_ITEMS,
  type NavId,
  TalkHint,
  type TalkHintProps,
  TopBar,
  type TopBarProps,
} from './AppShell';
export { AskBox, type AskBoxProps } from './AskBox';
export { Button, type ButtonProps, type ButtonTone } from './Button';
export { Card, CardFoot, type CardProps, type CardTint } from './Card';
export { Chip, type ChipProps } from './Chip';
export { MicIcon, NavIcon, type NavIconName, Wordmark } from './icons';
export { PHONE_QUERY, useMediaQuery, usePhone } from './media';
export { Segmented, type SegmentedOption, type SegmentedProps } from './Segmented';
export { type StreakDay, StreakDays, type StreakDaysProps } from './StreakDays';
export { HandNote, Label, Pill, Sticker, type StickerProps, Tag } from './Text';
export { Tile, type TileProps } from './Tile';
export { Toggle, type ToggleProps, ToggleRow, type ToggleRowProps } from './Toggle';
export { WoboHead, type WoboHeadProps } from './WoboHead';
