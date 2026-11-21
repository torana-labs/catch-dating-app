import type {CatchLinkedTextPart} from "@catch/web-ui";

/**
 * A content template such as "Prefer a person? {whatsapp} or {walkthrough}."
 * as CatchLinkedText parts: each {name} becomes the link given for it, the
 * rest stays words. The words live in content; only the links are wired here.
 * A {name} with no link given stays as written, so a missing link shows up.
 */
export function linkedParts(template: string, links: Readonly<Record<string, CatchLinkedTextPart>>): CatchLinkedTextPart[] {
  return template.split(/(\{\w+\})/u).filter(Boolean).map((piece) => {
    const name = /^\{(\w+)\}$/u.exec(piece)?.[1];
    return name && links[name] !== undefined ? links[name] : piece;
  });
}
