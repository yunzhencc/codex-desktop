import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

export function LocalConversationPage() {
  const { t } = useTranslation();
  const { conversationId } = useParams();

  return (
    <section aria-labelledby="local-conversation-title" data-thread-kind="local">
      <h1 id="local-conversation-title">{t('localConversation.title')}</h1>
      <p>{conversationId}</p>
    </section>
  );
}
