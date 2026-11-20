/**
 * Returns the URL only if it uses http(s); otherwise undefined (renders a plain anchor).
 * React 18 passes javascript:/data: hrefs through unchanged, and legacy profile rows
 * written before server-side sanitizeUrl could still hold such values.
 */
export const safeHref = (url) => {
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : undefined;
};
