import tokens from './tokens.css?inline';

export function installThemeStyles() {
  const style = document.createElement('style');
  style.dataset.cordisUiTheme = '';
  style.textContent = tokens;
  document.head.append(style);
  return () => style.remove();
}
