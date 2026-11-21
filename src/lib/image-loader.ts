import { withBase } from "./site";

/**
 * Image loader for the static (GitHub Pages) build: serves images as they are, with the
 * base path added to local ones (/posters/…, /stores/…). Posters are already sized for the web.
 */
export default function staticImageLoader({ src }: { src: string; width: number; quality?: number }) {
  return withBase(src);
}
