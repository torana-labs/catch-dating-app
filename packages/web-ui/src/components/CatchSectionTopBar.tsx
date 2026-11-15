import {useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode} from "react";
import {CatchButton} from "./CatchButton";
import {CatchMenu} from "./CatchMenu";
import styles from "./CatchSectionTopBar.module.css";

/** One section of the page: the id of its element and the words for it. */
export interface CatchSectionTopBarSection {
  id: string;
  label: string;
}

export interface CatchSectionTopBarProps {
  /** The bar's accessible name, such as "On this page". Resolved copy; the caller localizes it. */
  label: string;
  /** The page's sections, in page order; each id names an element on the page. */
  sections: readonly CatchSectionTopBarSection[];
  /** The page's one primary action, such as Start free trial, at the right end. */
  action?: ReactNode;
}

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * A long page's own sections, in a bar that takes the site top bar's place
 * once you scroll (the Apple product-page pattern, approved 15 Nov). Place it
 * right after the site top bar: until that bar has scrolled out of view the
 * section bar is hidden; then it slides in at the top of the window, with the
 * page's primary action. The section in view is underlined. Under 600px the
 * links become one menu named after the section you are in. It never repeats
 * the wordmark: the two bars are never on screen together.
 */
export function CatchSectionTopBar({label, sections, action}: CatchSectionTopBarProps) {
  const marker = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  // Shown once the marker (where the site top bar ends) has scrolled above the window.
  useEffect(() => {
    const node = marker.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The section in view: the first one whose band crosses the band under the bar.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id); else visible.delete(entry.target.id);
      }
      const first = sections.find((section) => visible.has(section.id));
      if (first) setCurrent(first.id);
    }, {rootMargin: "-64px 0px -55% 0px"});
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  const jump = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = bar.current?.offsetHeight ?? 0;
    window.scrollTo({top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: reducedMotion() ? "auto" : "smooth"});
    window.history.replaceState(window.history.state, "", `#${id}`);
    setCurrent(id);
  }, []);
  const follow = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    jump(id);
  };
  const currentLabel = sections.find((section) => section.id === current)?.label ?? sections[0]?.label ?? label;

  return (
    <>
      <span aria-hidden="true" className={styles.marker} ref={marker} />
      <nav aria-label={label} className={styles.bar} data-shown={shown ? "" : undefined} ref={bar}>
        <span className={styles.row}>
          <span className={styles.links}>
            {sections.map((section) => (
              <a aria-current={section.id === current ? "location" : undefined} className={styles.link} href={`#${section.id}`}
                key={section.id} onClick={follow(section.id)}>{section.label}</a>
            ))}
          </span>
          <span className={styles.menu}>
            <CatchMenu
              builder={(menu) => <CatchButton {...menu.triggerProps} label={currentLabel} onPressed={menu.toggle} size="sm" trailingIcon="expand" variant="secondary" />}
              items={sections.map((section) => ({value: section.id, label: section.label, selected: section.id === current, variant: "choice" as const}))}
              label={label}
              onSelected={jump}
              recipe="anchored"
              width={240}
            />
          </span>
          {action ? <span className={styles.action}>{action}</span> : null}
        </span>
      </nav>
    </>
  );
}
