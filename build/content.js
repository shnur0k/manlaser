import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { CONTENT_DIR, LOGO_FILE } from './paths.js';

const read = (file) => fs.readFileSync(file, 'utf8').replace(/^﻿/, '');

export function loadJSON(name) {
  const file = path.join(CONTENT_DIR, `${name}.json`);
  try {
    return JSON.parse(read(file));
  } catch (err) {
    // Понятная ошибка для того, кто правит контент руками
    throw new Error(`Ошибка в файле content/${name}.json: ${err.message}. Проверьте запятые и кавычки.`);
  }
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function loadPosts() {
  const dir = path.join(CONTENT_DIR, 'blog');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((file) => {
      const { data, content } = matter(read(path.join(dir, file)));
      const slug = data.slug || slugify(file);
      const words = content.split(/\s+/).filter(Boolean).length;
      return {
        slug,
        url: `/blog/${slug}/`,
        title: data.title || slug,
        description: data.description || '',
        date: data.date ? new Date(data.date) : null,
        tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
        cover: data.cover || null,
        draft: Boolean(data.draft),
        readingMinutes: Math.max(1, Math.round(words / 180)),
        html: marked.parse(content),
      };
    })
    .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
}

export function loadLogo() {
  return read(LOGO_FILE).replace(/<\?xml[^>]*>\s*/, '');
}

/** Весь контент сайта одним объектом. Читается заново при каждом рендере в dev. */
export function loadContent() {
  return {
    site: loadJSON('site'),
    pages: loadJSON('pages'),
    services: loadJSON('services'),
    faq: loadJSON('faq'),
    reviews: loadJSON('reviews'),
    media: loadJSON('media'),
    gallery: fs.existsSync(path.join(CONTENT_DIR, 'gallery.json')) ? loadJSON('gallery') : { items: [] },
    prices: fs.existsSync(path.join(CONTENT_DIR, 'prices.json')) ? loadJSON('prices') : {},
    posts: loadPosts(),
    logo: loadLogo(),
  };
}
