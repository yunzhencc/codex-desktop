import { useTranslation } from 'react-i18next';
import { Outlet, useParams } from 'react-router-dom';
import { Composer } from './composer';
import styles from './conversation-page.module.css';

export function ConversationPage() {
  const { conversationId } = useParams();
  const { t } = useTranslation();
  const surface = conversationId === undefined ? 'home' : 'local';

  return (
    <section className={styles.root} data-conversation-surface={surface}>
      <div className={styles.content}><Outlet /></div>
      <div className={styles.composerSeat}>
        {surface === 'home' && (
          <div aria-label={t('conversation.context.label')} className={styles.context} data-composer-context>
            <span>{t('conversation.context.project')}</span>
            <span>{t('conversation.context.local')}</span>
          </div>
        )}
        <Composer placeholder={t('conversation.composer.placeholder')} sendLabel={t('conversation.composer.send')} />
      </div>
    </section>
  );
}
