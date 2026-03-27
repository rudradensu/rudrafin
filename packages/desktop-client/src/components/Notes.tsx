import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import { getNormalisedString } from 'loot-core/shared/normalisation';
import type { TagEntity } from 'loot-core/types/models';

import { useTagCSS } from '@desktop-client/hooks/useTagCSS';
import { useTags } from '@desktop-client/hooks/useTags';
import {
  markdownBaseStyles,
  remarkBreaks,
  sequentialNewlinesPlugin,
} from '@desktop-client/util/markdown';

const remarkPlugins = [sequentialNewlinesPlugin, remarkGfm, remarkBreaks];

const TAG_DROPDOWN_CLOSE_DELAY_MS = 150;

const markdownStyles = css(markdownBaseStyles, {
  display: 'block',
  maxWidth: 350,
  padding: 8,
});

type TagSuggestionsProps = {
  query: string;
  activeIndex: number;
  tags: TagEntity[];
  onSelect: (tag: TagEntity) => void;
};

function TagSuggestions({
  query,
  activeIndex,
  tags,
  onSelect,
}: TagSuggestionsProps) {
  const getTagCSS = useTagCSS();
  const filtered = tags.filter(t =>
    getNormalisedString(t.tag).includes(getNormalisedString(query)),
  );

  if (filtered.length === 0) {
    return null;
  }

  return (
    <View
      className={css({
        position: 'absolute',
        zIndex: 100,
        left: 0,
        right: 0,
        top: '100%',
        marginTop: 2,
        backgroundColor: theme.menuBackground,
        border: '1px solid ' + theme.menuBorder,
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxHeight: 200,
        overflowY: 'auto',
      })}
    >
      {filtered.map((tag, idx) => (
        <View
          key={tag.id}
          className={css({
            padding: '6px 10px',
            cursor: 'pointer',
            backgroundColor:
              idx === activeIndex
                ? theme.menuItemBackgroundHover
                : 'transparent',
            '&:hover': {
              backgroundColor: theme.menuItemBackgroundHover,
            },
          })}
          onMouseDown={e => {
            // Use mousedown to prevent textarea blur before click
            e.preventDefault();
            onSelect(tag);
          }}
        >
          <Text className={getTagCSS(tag.tag)}>#{tag.tag}</Text>
        </View>
      ))}
    </View>
  );
}

type NotesProps = {
  notes: string;
  editable?: boolean;
  focused?: boolean;
  onChange?: (value: string) => void;
  onBlur?: (value: string) => void;
  getStyle?: (editable: boolean) => CSSProperties;
};

export function Notes({
  notes,
  editable,
  focused,
  onChange,
  onBlur,
  getStyle,
}: NotesProps) {
  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { data: tags = [] } = useTags();

  const [tagQuery, setTagQuery] = useState<string | null>(null);
  const [activeTagIdx, setActiveTagIdx] = useState(0);

  useEffect(() => {
    if (focused && editable) {
      textAreaRef.current?.focus();
    }
  }, [focused, editable]);

  function getTagQueryAtCursor(
    value: string,
    cursorPos: number,
  ): string | null {
    const textBeforeCursor = value.slice(0, cursorPos);
    // Find the last # before the cursor that is preceded by whitespace or is at the start
    const hashMatch = textBeforeCursor.match(/(^|[\s\n])#(\S*)$/);
    if (hashMatch) {
      return hashMatch[2]; // Return text after #
    }
    return null;
  }

  function getFilteredTags(query: string): TagEntity[] {
    return tags.filter(tag =>
      getNormalisedString(tag.tag).includes(getNormalisedString(query)),
    );
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    onChange?.(value);

    const cursorPos = e.target.selectionStart ?? value.length;
    const query = getTagQueryAtCursor(value, cursorPos);
    setTagQuery(query);
    setActiveTagIdx(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (tagQuery === null) return;

    const filtered = getFilteredTags(tagQuery);
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveTagIdx(idx => Math.min(idx + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveTagIdx(idx => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const selectedTag = filtered[activeTagIdx];
      if (selectedTag) {
        e.preventDefault();
        insertTag(selectedTag);
      }
    } else if (e.key === 'Escape') {
      setTagQuery(null);
    }
  }

  function insertTag(tag: TagEntity) {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart ?? 0;
    const value = notes || '';
    const textBeforeCursor = value.slice(0, cursorPos);
    // Find the # we're completing
    const hashMatch = textBeforeCursor.match(/(^|[\s\n])(#\S*)$/);
    if (!hashMatch) return;

    const hashStartIdx = textBeforeCursor.lastIndexOf(hashMatch[2]);
    const newValue =
      value.slice(0, hashStartIdx) + `#${tag.tag} ` + value.slice(cursorPos);

    onChange?.(newValue);
    setTagQuery(null);

    // Restore cursor after the inserted tag
    const newCursorPos = hashStartIdx + tag.tag.length + 2; // +2 for # and space
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  }

  return editable ? (
    <View style={{ position: 'relative', flex: 1 }}>
      <textarea
        ref={textAreaRef}
        className={css({
          border: '1px solid ' + theme.buttonNormalBorder,
          padding: 7,
          ...(!isNarrowWidth && { minWidth: 350, minHeight: 120 }),
          outline: 'none',
          backgroundColor: theme.tableBackground,
          color: theme.tableText,
          width: '100%',
          boxSizing: 'border-box',
          ...getStyle?.(editable),
        })}
        value={notes || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={e => {
          onBlur?.(e.target.value);
          // Delay closing so mousedown on suggestion can fire first
          setTimeout(() => setTagQuery(null), TAG_DROPDOWN_CLOSE_DELAY_MS);
        }}
        placeholder={t('Notes (markdown supported)')}
      />
      {tagQuery !== null && (
        <TagSuggestions
          query={tagQuery}
          activeIndex={activeTagIdx}
          tags={tags}
          onSelect={insertTag}
        />
      )}
    </View>
  ) : (
    <Text className={css([markdownStyles, getStyle?.(editable ?? false)])}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={[
          [
            rehypeExternalLinks,
            { target: '_blank', rel: ['noopener', 'noreferrer'] },
          ],
        ]}
      >
        {notes}
      </ReactMarkdown>
    </Text>
  );
}
