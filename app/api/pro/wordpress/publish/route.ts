import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { readPRCommsStore, writePRCommsStore } from "@/lib/pr-comms-store";
import { readPlatformSettings } from "@/lib/platform-store";
import { createWordPressPost } from "@/lib/wordpress";

const schema = z.object({
  prCommId: z.string().min(1),
  category: z.string().min(2).optional()
});

function isAbsoluteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function withMediaSection(content: string, mediaRefs: string[] = []) {
  const trimmed = content.trim();
  const cleanRefs = mediaRefs.map((item) => item.trim()).filter(Boolean);
  if (cleanRefs.length === 0) {
    return trimmed;
  }

  const mediaLines = cleanRefs.map((item, index) => {
    if (!isAbsoluteUrl(item)) {
      return `<li>Media ${index + 1}: ${item}</li>`;
    }
    const lower = item.toLowerCase();
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"].some((ext) => lower.endsWith(ext));
    if (isImage) {
      return `<li><a href="${item}" target="_blank" rel="noopener noreferrer">Media ${index + 1}</a><br /><img src="${item}" alt="Communication media ${index + 1}" /></li>`;
    }
    return `<li><a href="${item}" target="_blank" rel="noopener noreferrer">Media ${index + 1}</a></li>`;
  });

  return `${trimmed}\n\n<h3>Media</h3>\n<ul>${mediaLines.join("")}</ul>`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "PRO" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = schema.parse(await request.json());
  const settings = await readPlatformSettings();
  const wordpressAppPassword =
    process.env.WORDPRESS_APP_PASSWORD?.trim() || settings.wordpress.appPassword?.trim() || "";

  if (!settings.wordpress.enabled) {
    return NextResponse.json({ error: "WordPress integration is disabled in settings." }, { status: 400 });
  }
  if (!settings.wordpress.baseUrl || !settings.wordpress.username || !wordpressAppPassword) {
    return NextResponse.json(
      { error: "WordPress settings are incomplete. Add base URL, username, and WORDPRESS_APP_PASSWORD." },
      { status: 400 }
    );
  }

  const category = payload.category?.trim() || settings.wordpress.defaultCategory;
  if (!settings.wordpress.categories.includes(category)) {
    return NextResponse.json({ error: "Selected WordPress category is not allowed." }, { status: 400 });
  }

  const prItems = readPRCommsStore();
  const prItem = prItems.find((item) => item.id === payload.prCommId);
  if (!prItem) {
    return NextResponse.json({ error: "Draft communication not found." }, { status: 404 });
  }
  if (prItem.status !== "approved") {
    return NextResponse.json({ error: "Only approved communications can be published live to WordPress." }, { status: 400 });
  }

  const wordpressContent = withMediaSection(prItem.body, prItem.mediaRefs ?? []);

  try {
    const post = await createWordPressPost(
      {
        baseUrl: settings.wordpress.baseUrl,
        username: settings.wordpress.username,
        appPassword: wordpressAppPassword
      },
      {
        title: prItem.headline,
        content: wordpressContent,
        status: "publish",
        categoryNames: [category]
      }
    );

    prItem.wordpressPostId = post.id;
    prItem.wordpressPostUrl = post.link;
    prItem.wordpressCategory = category;
    prItem.wordpressStatus = "publish";
    prItem.wordpressPublishedAt = new Date().toISOString();
    prItem.status = "sent";
    writePRCommsStore(prItems);

    return NextResponse.json({
      ok: true,
      item: prItem,
      wordpress: {
        postId: post.id,
        url: post.link
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to publish draft to WordPress." },
      { status: 400 }
    );
  }
}
