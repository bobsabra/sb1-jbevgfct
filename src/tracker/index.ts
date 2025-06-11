import { v4 as uuidv4 } from 'uuid';
import * as sha256Lib from 'js-sha256';
import Cookies from 'js-cookie';

// Constants
const STORAGE_PREFIX = 'gtracker_';
const VISITOR_ID_KEY = `${STORAGE_PREFIX}visitor_id`;
const CONSENT_KEY = `${STORAGE_PREFIX}consent_given`;
const API_ENDPOINT = 'https://ucczkgrnxvhxgnvrityk.supabase.co/functions/v1/event-capture';

// Types
interface ClickIds {
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  msclkid?: string;
  [key: string]: string | undefined;
}

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface EventPayload {
  client_id: string;
  visitor_id: string;
  event_type: string;
  email_hash?: string;
  utm_params?: UTMParams;
  click_ids?: ClickIds;
  timestamp: string;
  page_url: string;
  referrer?: string;
}

class AttributionTracker {
  private clientId: string;
  private visitorId: string;
  private utmParams: UTMParams = {};
  private clickIds: ClickIds = {};
  private hasConsent: boolean = false;

  constructor() {
    console.log('AttributionTracker initializing...');
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('Client ID is required. Add data-client-id attribute to the script tag.');
    }
    console.log('Client ID:', clientId);
    this.clientId = clientId;
    this.checkConsent();
    this.visitorId = this.getOrCreateVisitorId();
    console.log('Visitor ID:', this.visitorId);
    this.captureUrlParams();
    this.setupFormListeners();
    this.trackPageView();
  }

  private getClientId(): string {
    const script = document.currentScript as HTMLScriptElement;
    return script?.getAttribute('data-client-id') || '';
  }

  private checkConsent(): void {
    const consentValue = this.getFromStorage(CONSENT_KEY);
    this.hasConsent = consentValue === 'true' || consentValue !== 'false';
  }

  private getOrCreateVisitorId(): string {
    let visitorId = this.getFromStorage(VISITOR_ID_KEY);
    
    if (!visitorId) {
      visitorId = uuidv4();
      if (this.hasConsent) {
        this.saveToStorage(VISITOR_ID_KEY, visitorId);
      }
    }
    
    return visitorId;
  }

  private saveToStorage(key: string, value: string): void {
    if (!this.hasConsent) return;
    
    console.log('Saving to storage:', { key, value });
    try {
      localStorage.setItem(key, value);
      console.log('Successfully saved to localStorage');
    } catch (e) {
      console.log('localStorage failed, falling back to cookies:', e);
      Cookies.set(key, value, { expires: 30, sameSite: 'Lax' });
    }
  }

  private getFromStorage(key: string): string | null {
    console.log('Getting from storage:', key);
    try {
      const value = localStorage.getItem(key);
      if (value) {
        console.log('Found in localStorage:', value);
        return value;
      }
    } catch (e) {
      console.log('localStorage access failed:', e);
    }
    
    const cookieValue = Cookies.get(key);
    console.log('Cookie value:', cookieValue);
    return cookieValue || null;
  }

  private captureUrlParams(): void {
    const params = new URLSearchParams(window.location.search);
    
    // Capture UTM parameters
    const utmParams: UTMParams = {};
    ['source', 'medium', 'campaign', 'content', 'term'].forEach(param => {
      const value = params.get(`utm_${param}`);
      if (value) {
        utmParams[param as keyof UTMParams] = value;
      }
    });
    this.utmParams = utmParams;

    // Capture click IDs
    const clickIds: ClickIds = {};
    ['fbclid', 'gclid', 'ttclid', 'msclkid'].forEach(param => {
      const value = params.get(param);
      if (value) {
        clickIds[param] = value;
      }
    });
    this.clickIds = clickIds;

    // Save parameters if we have consent
    if (this.hasConsent) {
      if (Object.keys(this.utmParams).length > 0) {
        this.saveToStorage(`${STORAGE_PREFIX}utm`, JSON.stringify(this.utmParams));
      }
      if (Object.keys(this.clickIds).length > 0) {
        this.saveToStorage(`${STORAGE_PREFIX}click_ids`, JSON.stringify(this.clickIds));
      }
    }
  }

  private setupFormListeners(): void {
    document.addEventListener('submit', async (event: Event) => {
      const form = event.target as HTMLFormElement;
      if (!form || !(form instanceof HTMLFormElement)) return;

      const emailInput = form.querySelector('input[type="email"], input[name="email"], input[name*="email"]') as HTMLInputElement;
      if (emailInput?.value) {
        const emailHash = await this.hashEmail(emailInput.value.trim().toLowerCase());
        this.trackEvent('form_submit', emailHash);
      }
    });

    // Listen for checkout button clicks
    document.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      if (
        target.matches('[data-checkout="true"], .checkout-button, #checkout') ||
        target.closest('[data-checkout="true"], .checkout-button, #checkout')
      ) {
        this.trackEvent('checkout_click');
      }
    });
  }

  private async hashEmail(email: string): Promise<string> {
    return sha256Lib.sha256(email);
  }

  private trackPageView(): void {
    this.trackEvent('page_view');
  }

  private trackEvent(eventType: string, emailHash?: string): void {
    if (!this.hasConsent) return;

    const payload: EventPayload = {
      client_id: this.clientId,
      visitor_id: this.visitorId,
      event_type: eventType,
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      utm_params: Object.keys(this.utmParams).length > 0 ? this.utmParams : undefined,
      click_ids: Object.keys(this.clickIds).length > 0 ? this.clickIds : undefined
    };

    if (emailHash) {
      payload.email_hash = emailHash;
    }

    this.sendEvent(payload);
  }

  private sendEvent(payload: EventPayload): void {
    console.log('Sending event:', payload);
    if (navigator.sendBeacon) {
      console.log('Using sendBeacon API');
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const success = navigator.sendBeacon(API_ENDPOINT, blob);
      console.log('sendBeacon result:', success);
    } else {
      console.log('Using fetch API');
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            console.error('Event API error:', {
              status: response.status,
              statusText: response.statusText,
              body: text
            });
            throw new Error(`HTTP error! status: ${response.status}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('Event API response:', data);
      })
      .catch(error => {
        console.error('Failed to send event:', error);
      });
    }
  }

  public trackConversion(conversionType: string, value?: number, currency?: string): void {
    if (!this.hasConsent) return;

    const payload: EventPayload = {
      client_id: this.clientId,
      visitor_id: this.visitorId,
      event_type: 'conversion',
      timestamp: new Date().toISOString(),
      page_url: window.location.href,
      utm_params: Object.keys(this.utmParams).length > 0 ? this.utmParams : undefined,
      click_ids: Object.keys(this.clickIds).length > 0 ? this.clickIds : undefined
    };

    this.sendEvent(payload);

    // Send additional conversion details
    fetch(`${API_ENDPOINT}/conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...payload,
        conversion_type: conversionType,
        value,
        currency
      }),
      keepalive: true
    }).catch(error => {
      console.error('Failed to send conversion event:', error);
    });
  }

  public setConsent(hasConsent: boolean): void {
    this.hasConsent = hasConsent;
    this.saveToStorage(CONSENT_KEY, hasConsent.toString());

    if (hasConsent) {
      this.saveToStorage(VISITOR_ID_KEY, this.visitorId);
    }
  }
}

// Initialize and expose the tracker globally
const tracker = new AttributionTracker();
(window as any).gTracker = tracker;

export default tracker;