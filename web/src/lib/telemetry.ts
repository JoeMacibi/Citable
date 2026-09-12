export type TelemetryEvent =
  | { name: 'signup_completed'; properties: { method: 'email' | 'oauth'; plan: string } }
  | { name: 'onboarding_domain_submitted'; properties: { domain: string; intent: string } }
  | { name: 'audit_started'; properties: { auditId: string; domain: string } }
  | { name: 'audit_completed'; properties: { auditId: string; score: number; durationMs: number } }
  | { name: 'recommendation_viewed'; properties: { findingId: string; category: string } }
  | { name: 'recommendation_approved'; properties: { findingId: string; fixType: string } }
  | { name: 'product_added'; properties: { productId: string; hasSchema: boolean } }
  | { name: 'ai_check_created'; properties: { prompt: string; providerCount: number } };

export class TelemetryService {
  private static instance: TelemetryService;

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  public track<T extends TelemetryEvent>(event: T): void {
    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[Telemetry Event]', payload);
      return;
    }

    try {
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.capture(event.name, event.properties);
      }
    } catch (err) {
      console.error('Failed to send telemetry event:', err);
    }
  }
}

export const telemetry = TelemetryService.getInstance();
