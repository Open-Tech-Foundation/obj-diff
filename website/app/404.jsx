export const metadata = {
  title: { absolute: "obj-diff — Page not found" },
  description: "The page you are looking for does not exist or has moved.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main class="diff-lab">
      <section class="lab-hero">
        <div class="eyebrow">404</div>
        <h1>Page not found.</h1>
        <p>The page you are looking for does not exist or has moved.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="/">Go home</a>
          <a class="button button-secondary" href="/docs">Read the docs</a>
        </div>
      </section>
    </main>
  );
}
