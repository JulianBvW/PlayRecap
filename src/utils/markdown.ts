/**
 * Strips Markdown formatting to plain prose for TTS.
 * Called before sending any assistant message to the Voxtral audio endpoint
 * so that symbols like **, ##, |, and - are never read aloud.
 */
export function stripMarkdown(text: string): string {
  return (
    text
      // Fenced code blocks — remove entirely, content is not useful as spoken prose
      .replace(/```[\s\S]*?```/g, '')
      // Inline code — unwrap, keep the text
      .replace(/`([^`\n]+)`/g, '$1')
      // Heading markers — keep the heading text
      .replace(/^#{1,6}\s+/gm, '')
      // Bold + italic combined (must precede bold-only to avoid partial matches)
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/___(.+?)___/g, '$1')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      // Italic
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Links — keep display text, drop the URL
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Table rows and separator lines
      .replace(/^\|.*\|$/gm, '')
      .replace(/^[\s|:-]+$/gm, '')
      // Unordered and ordered list bullet markers
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Collapse blank lines left by removed blocks
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
