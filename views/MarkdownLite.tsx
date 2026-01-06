import React from 'react';

interface MarkdownLiteProps {
  text: string;
}

/**
 * A ultra-lightweight markdown renderer that supports:
 * **bold** -> <strong>
 * - list item -> <li>
 * Preserves line breaks.
 */
export const MarkdownLite: React.FC<MarkdownLiteProps> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="text-sm text-gray-300 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        let processedLine = line.trim();
        
        // Handle Bullet Lists
        if (processedLine.startsWith('- ')) {
          const content = processedLine.slice(2);
          return (
            <div key={i} className="flex gap-2">
              <span className="text-blue-500">•</span>
              <span>{renderBold(content)}</span>
            </div>
          );
        }

        return <p key={i} className="min-h-[1em]">{renderBold(processedLine)}</p>;
      })}
    </div>
  );
};

function renderBold(text: string) {
  // Using hex codes to avoid potential environment-specific character replacements
  // \x2a is '*'
  const boldRegex = /(\x2a\x2a.*?\x2a\x2a)/g;
  const parts = text.split(boldRegex);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
