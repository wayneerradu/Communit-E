const WORDPRESS_TIMEOUT_MS = 20_000;

function withTimeout(signal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WORDPRESS_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function authHeader(username: string, appPassword: string) {
  const token = Buffer.from(`${username}:${appPassword}`).toString("base64");
  return `Basic ${token}`;
}

type WordPressConfig = {
  baseUrl: string;
  username: string;
  appPassword: string;
};

type WordPressCategory = {
  id: number;
  name: string;
  slug?: string;
};

type WordPressPostPayload = {
  title: string;
  content: string;
  status: "draft" | "publish";
  categoryNames: string[];
};

export async function findOrCreateWordPressCategoryIds(config: WordPressConfig, categoryNames: string[]) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const auth = authHeader(config.username, config.appPassword);
  const wanted = Array.from(new Set(categoryNames.map((item) => item.trim()).filter(Boolean)));
  if (wanted.length === 0) {
    return [];
  }

  const { signal, clear } = withTimeout();
  try {
    const listResponse = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100`, {
      method: "GET",
      headers: { Authorization: auth },
      signal
    });
    if (!listResponse.ok) {
      throw new Error(`WordPress categories request failed (${listResponse.status}).`);
    }
    const listed = (await listResponse.json()) as WordPressCategory[];
    const ids: number[] = [];

    for (const name of wanted) {
      const existing = listed.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
      if (existing) {
        ids.push(existing.id);
        continue;
      }

      const createResponse = await fetch(`${baseUrl}/wp-json/wp/v2/categories`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name }),
        signal
      });
      if (!createResponse.ok) {
        throw new Error(`Unable to create WordPress category "${name}" (${createResponse.status}).`);
      }
      const created = (await createResponse.json()) as WordPressCategory;
      ids.push(created.id);
    }

    return ids;
  } finally {
    clear();
  }
}

export async function createWordPressPost(config: WordPressConfig, payload: WordPressPostPayload) {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const auth = authHeader(config.username, config.appPassword);
  const categoryIds = await findOrCreateWordPressCategoryIds(config, payload.categoryNames);
  const { signal, clear } = withTimeout();

  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        status: payload.status,
        categories: categoryIds
      }),
      signal
    });
    if (!response.ok) {
      throw new Error(`WordPress post create failed (${response.status}).`);
    }

    const data = (await response.json()) as { id: number; link?: string };
    return {
      id: data.id,
      link: data.link ?? `${baseUrl}/?p=${data.id}`
    };
  } finally {
    clear();
  }
}

