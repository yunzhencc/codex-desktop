import { Slot } from '@yunzhen/cordis-ui-renderer';
import styles from './index.module.css';

export function GeneralSettings() {
  return <div className={styles.content} data-settings-general><Slot name="settings.general.items" /></div>;
}
