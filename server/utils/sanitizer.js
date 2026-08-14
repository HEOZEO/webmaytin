/**
 * Input sanitization utility to prevent XSS attacks
 * Uses strict whitelist approach - only allows specific safe tags
 */

const ALLOWED_TAGS = new Set(['b', 'i', 'strong', 'em', 'br', 'p']);
const ALLOWED_ATTRS = new Set(['class']);

const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  return text.replace(/[&<>"'`=/]/g, (char) => map[char]);
};

/**
 * Strict HTML sanitizer - only allows b, i, strong, em, br, p tags
 * Strips ALL other tags and their content
 * Strips ALL attributes except class
 * Recommended for: review comments, order notes, contact messages
 */
const sanitizeHtml = (dirtyHtml) => {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  let cleaned = dirtyHtml;

  // Step 1: Remove script tags and their content completely
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Step 2: Remove all event handlers and javascript attributes
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

  // Step 3: Remove dangerous tags (strip entire tag + content)
  const dangerousTags = [
    'iframe', 'object', 'embed', 'form', 'input', 'button', 'select',
    'textarea', 'svg', 'math', 'link', 'meta', 'base', 'applet'
  ];
  for (const tag of dangerousTags) {
    const regex = new RegExp(`<${tag}\\b[^>]*>(?:[\\s\\S]*?)</${tag}>`, 'gi');
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/?>`, 'gi');
    cleaned = cleaned.replace(regex, '');
    cleaned = cleaned.replace(selfClosingRegex, '');
  }

  // Step 4: Remove any attribute that looks dangerous (on*, javascript:, data:)
  cleaned = cleaned.replace(/\s*(\w+)\s*=\s*["'][^"']*(?:javascript:|data:|vbscript:)[^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*(\w+)\s*=\s*[^\s>]*(?:javascript:|data:|vbscript:)[^\s>]*[^\s>]*>/gi, '');

  // Step 5: Remove style attributes with expressions or behaviors
  cleaned = cleaned.replace(/\s*style\s*=\s*["'][^"']*(?:expression|behavior|url\(|@import)[^"']*["']/gi, '');

  // Step 6: Remove data URIs
  cleaned = cleaned.replace(/data:[^,\s]*,/gi, '');

  // Step 7: Keep only allowed tags - strip everything else
  // First, escape everything that's not an allowed tag
  let result = '';
  let inTag = false;
  let i = 0;

  while (i < cleaned.length) {
    if (cleaned[i] === '<') {
      // Find the tag name
      const tagEnd = cleaned.indexOf('>', i);
      if (tagEnd === -1) {
        result += escapeHtml(cleaned.slice(i));
        break;
      }

      const tagContent = cleaned.slice(i, tagEnd + 1);
      const tagMatch = tagContent.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*)>/i);

      if (!tagMatch) {
        // Malformed tag - escape it
        result += escapeHtml(tagContent);
        i = tagEnd + 1;
        continue;
      }

      const [, tagName, attrs] = tagMatch;
      const isClosing = tagContent.startsWith('</');
      const normalizedTag = tagName.toLowerCase();

      if (ALLOWED_TAGS.has(normalizedTag)) {
        // Validate attributes
        let safeAttrs = '';
        const attrRegex = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let attrMatch;

        while ((attrMatch = attrRegex.exec(attrs)) !== null) {
          const [, attrName, dqVal, sqVal, bareVal] = attrMatch;
          const attrNameLower = attrName.toLowerCase();

          if (ALLOWED_ATTRS.has(attrNameLower) && (dqVal !== undefined || sqVal !== undefined || bareVal !== undefined)) {
            const val = dqVal ?? sqVal ?? bareVal;
            safeAttrs += ` ${attrNameLower}="${escapeHtml(val)}"`;
          }
        }

        if (isClosing) {
          result += `</${normalizedTag}>`;
        } else {
          // Self-closing tags
          if (['br'].includes(normalizedTag)) {
            result += `<${normalizedTag}${safeAttrs} />`;
          } else {
            result += `<${normalizedTag}${safeAttrs}>`;
          }
        }
      }
      // Non-allowed tags are stripped silently (no output)

      i = tagEnd + 1;
    } else {
      // Regular text - escape HTML entities
      result += escapeHtml(cleaned[i]);
      i++;
    }
  }

  // Step 8: Final cleanup - replace multiple newlines with double newline
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.slice(0, 5000); // Hard cap at 5000 chars
};

/**
 * Sanitize plain text input - removes dangerous characters but keeps formatting
 * Recommended for: names, addresses, phone numbers, email
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return typeof input === 'number' ? String(input) : '';
  }

  let cleaned = input;

  // Trim whitespace
  cleaned = cleaned.trim();

  // Remove null bytes
  cleaned = cleaned.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove Unicode formatting characters that could be used for spoofing
  cleaned = cleaned.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Cap at reasonable length (1000 chars for general input, specific fields have their own limits)
  if (cleaned.length > 1000) {
    cleaned = cleaned.slice(0, 1000);
  }

  return cleaned;
};

/**
 * Sanitize order notes - longer content with limited HTML
 */
const sanitizeOrderNotes = (notes) => {
  if (!notes || typeof notes !== 'string') {
    return '';
  }

  // First strip HTML, then allow only br and p
  let cleaned = notes;
  cleaned = cleaned.replace(/<[^>]+>/g, ' '); // Replace all tags with space
  cleaned = cleaned.replace(/\s+/g, ' '); // Collapse whitespace
  cleaned = sanitizeInput(cleaned);

  return cleaned.slice(0, 500);
};

/**
 * Sanitize review comment - allows limited HTML
 */
const sanitizeReviewComment = (comment) => {
  return sanitizeHtml(comment);
};

module.exports = {
  sanitizeHtml,
  escapeHtml,
  sanitizeInput,
  sanitizeOrderNotes,
  sanitizeReviewComment,
  ALLOWED_TAGS
};
