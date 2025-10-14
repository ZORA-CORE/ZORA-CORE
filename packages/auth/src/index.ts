import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type VerifyRegistrationResponseOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifyAuthenticationResponseOpts
} from "@simplewebauthn/server";
import { Client } from "oauth4webapi";
import { z } from "zod";

export const PasskeyRegistrationRequest = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string()
});

export const OAuthProviderConfig = z.object({
  issuer: z.string().url(),
  clientId: z.string(),
  redirectUri: z.string().url(),
  scopes: z.array(z.string())
});

export async function createPasskeyRegistrationOptions(
  options: GenerateRegistrationOptionsOpts
) {
  return generateRegistrationOptions(options);
}

export async function validatePasskeyRegistrationResponse(
  options: VerifyRegistrationResponseOpts
) {
  return verifyRegistrationResponse(options);
}

export async function createPasskeyAuthenticationOptions(
  options: GenerateAuthenticationOptionsOpts
) {
  return generateAuthenticationOptions(options);
}

export async function validatePasskeyAuthenticationResponse(
  options: VerifyAuthenticationResponseOpts
) {
  return verifyAuthenticationResponse(options);
}

export function createOAuthClient(config: z.infer<typeof OAuthProviderConfig>) {
  const validated = OAuthProviderConfig.parse(config);
  const client = new Client({
    client_id: validated.clientId
  });
  return { client, validated };
}
