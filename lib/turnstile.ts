type TurnstileResult = {
  ok: boolean;
  error?: string;
};

export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<TurnstileResult> {
  const secret = process.env.CLOUDFLARE_TURNSTILE_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      error: "Cloudflare Turnstile secret is not configured on the server."
    };
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!response.ok) {
      return {
        ok: false,
        error: "Turnstile verification could not be completed."
      };
    }

    const payload = (await response.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (!payload.success) {
      return {
        ok: false,
        error: payload["error-codes"]?.join(", ") || "Turnstile verification failed."
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Turnstile verification failed because the verification service could not be reached."
    };
  }
}
