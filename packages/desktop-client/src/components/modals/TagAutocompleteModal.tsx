import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNormalisedString } from 'loot-core/shared/normalisation';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { useTagCSS } from '@desktop-client/hooks/useTagCSS';
import { useTags } from '@desktop-client/hooks/useTags';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type TagAutocompleteModalProps = Extract<
  ModalType,
  { name: 'tag-autocomplete' }
>['options'];

export function TagAutocompleteModal({
  onSelect,
  onClose,
}: TagAutocompleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const { data: tags = [] } = useTags();
  const getTagCSS = useTagCSS();
  const [filter, setFilter] = useState('');

  const filteredTags = tags.filter(tag =>
    getNormalisedString(tag.tag).includes(getNormalisedString(filter)),
  );

  return (
    <Modal
      name="tag-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth
            ? 'calc(var(--visual-viewport-height) * 0.85)'
            : 340,
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={t('Select Tag')}
                getStyle={() => ({ color: theme.menuAutoCompleteText })}
              />
            }
            rightContent={
              <ModalCloseButton
                onPress={() => state.close()}
                style={{ color: theme.menuAutoCompleteText }}
              />
            }
          />
          <View
            style={{
              padding: '0 8px 8px',
              flex: 1,
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <Input
              autoFocus
              placeholder={t('Filter tags...')}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                ...styles.mediumText,
                color: theme.menuAutoCompleteText,
                backgroundColor: theme.menuAutoCompleteBackgroundHover,
                border: 'none',
                borderRadius: 4,
              }}
            />
            <View
              style={{
                overflowY: 'auto',
                flex: 1,
                gap: 2,
              }}
            >
              {filteredTags.length === 0 ? (
                <View
                  style={{
                    padding: 20,
                    alignItems: 'center',
                    color: theme.menuAutoCompleteText,
                    fontStyle: 'italic',
                  }}
                >
                  <Trans>No tags found</Trans>
                </View>
              ) : (
                filteredTags.map(tag => (
                  <Button
                    key={tag.id}
                    variant="bare"
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      padding: '8px 12px',
                      borderRadius: 4,
                      gap: 8,
                    }}
                    onPress={() => {
                      onSelect(`#${tag.tag}`);
                      state.close();
                    }}
                  >
                    <Text className={getTagCSS(tag.tag)}>#{tag.tag}</Text>
                    {tag.description && (
                      <Text
                        style={{
                          color: theme.menuAutoCompleteText,
                          fontSize: 13,
                          opacity: 0.7,
                        }}
                      >
                        {tag.description}
                      </Text>
                    )}
                  </Button>
                ))
              )}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
