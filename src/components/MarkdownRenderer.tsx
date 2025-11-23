import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface MarkdownRendererViewProps {
  content: string;
  className?: string;
}

type MarkdownCodeProps = React.ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
};

const MarkdownRendererView = ({ content, className }: MarkdownRendererViewProps) => {
  const components: Components = {
    code({ inline, className: codeClassName, children, ...props }: MarkdownCodeProps) {
      if (inline) {
        return (
          <code
            className={`rounded bg-muted px-1.5 py-0.5 text-xs ${codeClassName ?? ""}`}
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
          <code className={codeClassName} {...props}>
            {children}
          </code>
        </pre>
      );
    },
    a({ children, ...props }) {
      return (
        <a
          {...props}
          className="text-primary underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      );
    },
    ul({ children, ...props }) {
      return (
        <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }) {
      return (
        <ol className="list-decimal space-y-1 pl-5 marker:text-muted-foreground" {...props}>
          {children}
        </ol>
      );
    },
    blockquote({ children, ...props }) {
      return (
        <blockquote
          className="border-l-4 border-muted-foreground/30 bg-muted/50 px-3 py-2 text-muted-foreground"
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    p({ children, ...props }) {
      return (
        <p className="leading-relaxed" {...props}>
          {children}
        </p>
      );
    },
  };

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRendererView;
