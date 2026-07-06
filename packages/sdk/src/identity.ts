import type { ConsentTier } from '@classess/contracts';
import type { SdkConfig } from './config';

/**
 * The identity boundary. The whole app consumes `IdentityProvider`; app code only ever sees the
 * opaque `subject_id`, never email/phone/PII. Today it returns a dev-mock user (DEV_AUTH=true); at
 * Phase 4 a Supabase-backed provider returns the real session and NOTHING ELSE in the app changes.
 */
export interface Session {
  /** Opaque canonical subject UUID. The only identity app code sees. */
  subject_id: string;
  consent_tier: ConsentTier;
  surface: 'expo' | 'pwa';
  /** A display name from the profile cache (not PII in domain logic). */
  display_name?: string;
}

/** Raised by the auth seams, which are typed now and implemented at Phase 4 (never before approval). */
export class AuthNotEnabledError extends Error {
  constructor(seam: string) {
    super(`${seam} is a typed seam only; real auth is built at Phase 4 on explicit approval.`);
    this.name = 'AuthNotEnabledError';
  }
}

/** Parental consent record shape (DigiLocker-grade verification lands at Phase 4). */
export interface ParentalConsentRecord {
  subject_id: string;
  guardian_ref: string;
  verifier: 'digilocker';
  purposes: string[];
}

export interface AccountLink {
  subject_id: string;
  provider: 'phone';
  handle: string;
}

/** The stubbed-but-typed auth seams. Interfaces exist now; implementations are the final phase. */
export interface AuthSeams {
  requestPhoneOtp(phone: string): Promise<never>;
  verifyPhoneOtp(phone: string, code: string): Promise<never>;
  recordParentalConsent(record: ParentalConsentRecord): Promise<never>;
  linkAccount(link: AccountLink): Promise<never>;
}

export interface IdentityProvider {
  getSession(): Promise<Session>;
  /**
   * The access token PostgREST/RLS would use. In dev this is null (no client DB access yet); Phase 1
   * mints a dev JWT carrying subject_id as auth.uid(); Phase 4 returns the real Supabase token.
   */
  getAccessToken(): Promise<string | null>;
  auth: AuthSeams;
}

const notEnabled: AuthSeams = {
  requestPhoneOtp: async () => {
    throw new AuthNotEnabledError('phone-OTP signup');
  },
  verifyPhoneOtp: async () => {
    throw new AuthNotEnabledError('phone-OTP verification');
  },
  recordParentalConsent: async () => {
    throw new AuthNotEnabledError('parental-consent recording');
  },
  linkAccount: async () => {
    throw new AuthNotEnabledError('account linking');
  },
};

/** The dev-mock identity: a fixed opaque subject, a configurable consent tier, no login. */
export class DevMockIdentity implements IdentityProvider {
  readonly auth: AuthSeams = notEnabled;
  private readonly session: Session;
  private readonly accessToken: string | null;

  constructor(config: SdkConfig) {
    this.session = {
      subject_id: config.mockSubjectId,
      consent_tier: config.consentTierDefault,
      surface: config.surface,
      display_name: config.displayName,
    };
    // The Phase-1 dev JWT (sub = mockSubjectId, role authenticated), env-supplied — RLS keys on it.
    this.accessToken = config.supabaseAccessToken ?? null;
  }

  async getSession(): Promise<Session> {
    return this.session;
  }

  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }
}
