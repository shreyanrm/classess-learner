import { space } from '@classess/config';

/**
 * The shared content column — every screen breathes on the same rhythm. Comfortable reading width;
 * the shell centers it in the wide desktop content area and it fills the phone. Prose blocks cap their
 * own line length (~52ch) so a wider column stays readable.
 */
export const screenMain = {
  flex: 1,
  width: '100%',
  maxWidth: 900,
  margin: '0 auto',
  padding: `${space[4]}px ${space[3]}px ${space[12]}px`,
  display: 'flex',
  flexDirection: 'column',
  gap: space[3],
} as const;
