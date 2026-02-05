/**
 * ChatInput - Textarea with send button for the context chat
 *
 * Enter sends, Shift+Enter newline. Disabled when streaming.
 */

import { useState, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';
import { colors } from '../../styles/theme';

interface ChatInputProps {
  onSend: (text: string) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onAbort,
  isStreaming,
  disabled = false,
  placeholder = 'Ask about your context...',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() || disabled || isStreaming) return;
    onSend(text);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div style={styles.container}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        style={{
          ...styles.textarea,
          opacity: disabled ? 0.5 : 1,
        }}
      />
      {isStreaming ? (
        <button
          style={{ ...styles.sendButton, backgroundColor: colors.danger }}
          onClick={onAbort}
          title="Stop"
        >
          <Square size={14} fill="currentColor" />
        </button>
      ) : (
        <button
          style={{
            ...styles.sendButton,
            opacity: text.trim() && !disabled ? 1 : 0.3,
          }}
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Send (Enter)"
        >
          <Send size={14} />
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    padding: '0',
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: colors.bgInput,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '8px',
    color: colors.textPrimary,
    outline: 'none',
    resize: 'none' as const,
    lineHeight: 1.5,
    maxHeight: '120px',
    transition: 'border-color 200ms ease',
  },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: '8px',
    backgroundColor: colors.accent,
    color: '#fff',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'opacity 150ms ease, background-color 150ms ease',
  },
};
