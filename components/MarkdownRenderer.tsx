import { memo, useMemo, useState, type ReactNode } from 'react';
import { marked, type Tokens, type Token } from 'marked';
import { CheckIcon, CopyIcon } from '@/components/icons';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function safeUrl(href: string): string {
  const trimmed = href.trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('#') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return '#';
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const displayLang = (lang || 'code').trim().toLowerCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-header">
        <span className="markdown-code-lang">{displayLang}</span>
        <button
          type="button"
          className="markdown-code-copy"
          onClick={handleCopy}
          aria-label={copied ? 'Copied code' : 'Copy code'}
        >
          {copied ? (
            <>
              <CheckIcon size={12} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="markdown-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineTokens(tokens?: Token[]): ReactNode {
  if (!tokens || tokens.length === 0) return null;

  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'text': {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          return <span key={idx}>{renderInlineTokens(textToken.tokens)}</span>;
        }
        return <span key={idx}>{textToken.text}</span>;
      }
      case 'strong': {
        const strongToken = token as Tokens.Strong;
        return (
          <strong key={idx} className="markdown-strong">
            {renderInlineTokens(strongToken.tokens) || strongToken.text}
          </strong>
        );
      }
      case 'em': {
        const emToken = token as Tokens.Em;
        return (
          <em key={idx} className="markdown-em">
            {renderInlineTokens(emToken.tokens) || emToken.text}
          </em>
        );
      }
      case 'codespan': {
        const codeToken = token as Tokens.Codespan;
        return (
          <code key={idx} className="markdown-inline-code">
            {codeToken.text}
          </code>
        );
      }
      case 'del': {
        const delToken = token as Tokens.Del;
        return (
          <del key={idx} className="markdown-del">
            {renderInlineTokens(delToken.tokens) || delToken.text}
          </del>
        );
      }
      case 'link': {
        const linkToken = token as Tokens.Link;
        const validHref = safeUrl(linkToken.href);
        return (
          <a
            key={idx}
            href={validHref}
            target="_blank"
            rel="noopener noreferrer"
            title={linkToken.title || undefined}
            className="markdown-link"
            onClick={(e) => {
              if (validHref === '#') e.preventDefault();
            }}
          >
            {renderInlineTokens(linkToken.tokens) || linkToken.text}
          </a>
        );
      }
      case 'image': {
        const imgToken = token as Tokens.Image;
        const validSrc = safeUrl(imgToken.href);
        return (
          <img
            key={idx}
            src={validSrc}
            alt={imgToken.text || 'Image'}
            title={imgToken.title || undefined}
            className="markdown-img"
            loading="lazy"
          />
        );
      }
      case 'br':
        return <br key={idx} />;
      case 'escape': {
        const escapeToken = token as Tokens.Escape;
        return <span key={idx}>{escapeToken.text}</span>;
      }
      case 'html': {
        const htmlToken = token as Tokens.HTML;
        return <span key={idx}>{htmlToken.text}</span>;
      }
      default:
        return 'text' in token ? <span key={idx}>{(token as { text: string }).text}</span> : null;
    }
  });
}

function renderBlockToken(token: Token, key: number | string): ReactNode {
  switch (token.type) {
    case 'heading': {
      const heading = token as Tokens.Heading;
      const content = renderInlineTokens(heading.tokens) || heading.text;
      switch (heading.depth) {
        case 1:
          return <h1 key={key} className="markdown-h1">{content}</h1>;
        case 2:
          return <h2 key={key} className="markdown-h2">{content}</h2>;
        case 3:
          return <h3 key={key} className="markdown-h3">{content}</h3>;
        case 4:
          return <h4 key={key} className="markdown-h4">{content}</h4>;
        case 5:
          return <h5 key={key} className="markdown-h5">{content}</h5>;
        default:
          return <h6 key={key} className="markdown-h6">{content}</h6>;
      }
    }
    case 'paragraph': {
      const p = token as Tokens.Paragraph;
      return (
        <p key={key} className="markdown-p">
          {renderInlineTokens(p.tokens) || p.text}
        </p>
      );
    }
    case 'code': {
      const code = token as Tokens.Code;
      return <CodeBlock key={key} code={code.text} lang={code.lang} />;
    }
    case 'blockquote': {
      const bq = token as Tokens.Blockquote;
      return (
        <blockquote key={key} className="markdown-blockquote">
          {bq.tokens ? bq.tokens.map((sub, i) => renderBlockToken(sub, i)) : bq.text}
        </blockquote>
      );
    }
    case 'list': {
      const list = token as Tokens.List;
      const ListTag = list.ordered ? 'ol' : 'ul';
      return (
        <ListTag
          key={key}
          className={`markdown-list ${list.ordered ? 'markdown-list--ordered' : 'markdown-list--unordered'}`}
          start={list.ordered && typeof list.start === 'number' ? list.start : undefined}
        >
          {list.items.map((item, i) => (
            <li key={i} className={`markdown-list-item ${item.task ? 'markdown-list-item--task' : ''}`}>
              {item.task && (
                <input
                  type="checkbox"
                  checked={Boolean(item.checked)}
                  readOnly
                  className="markdown-task-checkbox"
                />
              )}
              <div className="markdown-list-item-content">
                {item.tokens && item.tokens.length > 0
                  ? item.tokens.map((sub, j) => {
                      if (sub.type === 'text') {
                        const t = sub as Tokens.Text;
                        return t.tokens ? renderInlineTokens(t.tokens) : t.text;
                      }
                      return renderBlockToken(sub, j);
                    })
                  : item.text}
              </div>
            </li>
          ))}
        </ListTag>
      );
    }
    case 'table': {
      const table = token as Tokens.Table;
      return (
        <div key={key} className="markdown-table-wrapper">
          <table className="markdown-table">
            <thead>
              <tr>
                {table.header.map((cell, cellIdx) => {
                  const align = table.align[cellIdx] || undefined;
                  return (
                    <th key={cellIdx} style={{ textAlign: align }}>
                      {renderInlineTokens(cell.tokens) || cell.text}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => {
                    const align = table.align[cellIdx] || undefined;
                    return (
                      <td key={cellIdx} style={{ textAlign: align }}>
                        {renderInlineTokens(cell.tokens) || cell.text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'hr':
      return <hr key={key} className="markdown-hr" />;
    case 'space':
      return null;
    case 'html': {
      const html = token as Tokens.HTML;
      return <div key={key} className="markdown-html-fallback">{html.text}</div>;
    }
    default:
      if ('tokens' in token && Array.isArray((token as { tokens?: Token[] }).tokens)) {
        return <div key={key}>{renderInlineTokens((token as { tokens?: Token[] }).tokens)}</div>;
      }
      return 'text' in token ? <p key={key} className="markdown-p">{(token as { text: string }).text}</p> : null;
  }
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  const tokens = useMemo(() => {
    if (!content) return [];
    try {
      return marked.lexer(content, { gfm: true, breaks: true });
    } catch {
      return [];
    }
  }, [content]);

  if (!content) return null;

  if (tokens.length === 0) {
    return <div className={`markdown-body ${className}`}>{content}</div>;
  }

  return (
    <div className={`markdown-body ${className}`}>
      {tokens.map((token, index) => renderBlockToken(token, index))}
    </div>
  );
});

export default MarkdownRenderer;
