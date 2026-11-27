import { OAuthClient } from "@atproto/oauth-client";
import { WebcryptoKey } from "@atproto/jwk-webcrypto";

globalThis.ThreadlineOAuthSdk = Object.freeze({ OAuthClient, WebcryptoKey });
