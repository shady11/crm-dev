import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

/**
 * Thin wrapper around otplib so the rest of the auth module never imports it
 * directly — keeps the TOTP library swappable and the secret-generation
 * policy (issuer name, digits, step) in one place.
 */
@Injectable()
export class TotpService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }

  keyUri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'CRM Dev', secret);
  }

  verify(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch {
      return false;
    }
  }
}
