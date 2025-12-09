import { Transform, TransformFnParams } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export const MARKDOWN_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'br',
    'ul',
    'li',
    'ol',
    'code',
    'pre',
    'blockquote',
  ],
  allowedAttributes: {
    a: ['href'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

export function SanitizeMarkdown() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value !== 'string') {
      return value as unknown;
    }

    return sanitizeHtml(value, MARKDOWN_SANITIZE_OPTIONS);
  });
}
