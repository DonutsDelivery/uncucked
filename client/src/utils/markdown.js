// Simple Discord markdown parser
// Handles: bold, italic, underline, strikethrough, code, spoilers, mentions

export function parseMarkdown(text) {
  if (!text) return '';

  // Escape HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (must be first to prevent inner parsing)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g,
    '<pre class="bg-discord-darker rounded p-2 my-1 overflow-x-auto"><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g,
    '<code class="bg-discord-darker px-1 rounded text-sm">$1</code>');

  // Spoilers
  html = html.replace(/\|\|(.+?)\|\|/g,
    '<span class="bg-discord-lighter rounded px-1 cursor-pointer spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

  // Bold italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (asterisk)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Italic (underscore)
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Underline
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // User mentions <@123456>
  html = html.replace(/&lt;@!?(\d+)&gt;/g,
    '<span class="bg-discord-blurple/20 text-discord-blurple rounded px-1">@user</span>');

  // Channel mentions <#123456>
  html = html.replace(/&lt;#(\d+)&gt;/g,
    '<span class="bg-discord-blurple/20 text-discord-blurple rounded px-1">#channel</span>');

  // Role mentions <@&123456>
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g,
    '<span class="bg-discord-blurple/20 text-discord-blurple rounded px-1">@role</span>');

  // Custom emoji <:name:id> and <a:name:id>
  html = html.replace(/&lt;(a?):(\w+):(\d+)&gt;/g, (_, animated, name, id) => {
    const ext = animated ? 'gif' : 'png';
    return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}" alt=":${name}:" title=":${name}:" class="inline-block w-5 h-5 align-middle" />`;
  });

  // URLs
  html = html.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#00aff4] hover:underline">$1</a>');

  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}
