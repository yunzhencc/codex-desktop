import { useTranslation } from 'react-i18next';

export function NewThreadPage() {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="new-thread-title" data-thread-kind="new">
      <h1 id="new-thread-title">
        {t('newThread.title')}
      </h1>
    </section>
  );
}
