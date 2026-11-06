const WEB_DOCS = "https://afw.opentechf.org";

function DocsMark() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" class="afwd-footer-badge-mark">
      <rect width="22" height="22" rx="6" fill="var(--afw-accent-soft)" />
      <path d="M6.5 6.5h3.75v9H6.5v-9zm5.25 0H15.5v9h-3.75v-9z" fill="none" stroke="var(--afw-accent)" stroke-width="1.35" stroke-linejoin="round" />
      <path d="M10.25 6.5v9M6.5 9.25h3.75M11.75 9.25H15.5M6.5 12h3.75M11.75 12H15.5" fill="none" stroke="var(--afw-accent)" stroke-width="1.1" stroke-linecap="round" opacity="0.55" />
    </svg>
  );
}

export default function BuiltWithBadge() {
  return (
    <a href={WEB_DOCS} target="_blank" rel="noreferrer" class="afwd-footer-badge" aria-label="Built with AFW">
      <DocsMark />
      <span class="afwd-footer-badge-copy">
        <span class="afwd-footer-badge-muted">Built with</span>
        <span class="afwd-footer-badge-brand"><span class="afwd-footer-badge-brand-afw">AFW</span></span>
      </span>
    </a>
  );
}
