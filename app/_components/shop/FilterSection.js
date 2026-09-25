export default function FilterSection({ title, children, id }) {
  return (
    <section aria-labelledby={id} className="border-t border-border-soft pt-5">
      <h3 id={id} className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
        {title}
      </h3>
      {children}
    </section>
  );
}
