// Canonical production origin for Skild Auto.
// Used for canonical links and Open Graph URLs so preview/dev hosts never
// get indexed as duplicates of the production site.
export const SITE_URL = "https://www.skildauto.com";

export const abs = (path: string) => `${SITE_URL}${path === "/" ? "/" : path}`;

/** Meta + link entries that make a route canonical & shareable. */
export function seoLinks(path: string) {
  return [{ rel: "canonical", href: abs(path) }];
}

/** Keep transactional/private routes out of the index. */
export const NOINDEX = { name: "robots", content: "noindex, nofollow" } as const;
