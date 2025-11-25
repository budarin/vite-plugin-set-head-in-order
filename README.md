## vite-plugin-set-head-in-order

Плагин Vite, который упорядочивает элементы внутри `<head>` по правилам capo.js, сохраняя порядок элементов внутри каждой группы.

### Почему

- Правильный порядок элементов в `<head>` влияет на производительность и корректность загрузки ресурсов.
- Плагин реализует порядок групп согласно правилам capo.js: `meta`, `base`, `title`, подсказки соединений, скрипты и стили в нужной последовательности, разделённые по типам.

### Ссылка на правила capo.js

- Правила упорядочивания: [capo.js — User rules](https://rviscomi.github.io/capo.js/user/rules/)

### Установка

```bash
pnpm add -D @budarin/vite-plugin-set-head-in-order
# или
npm i -D @budarin/vite-plugin-set-head-in-order
# или
yarn add -D @budarin/vite-plugin-set-head-in-order
```

### Использование

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import setHeadInOrderPlugin from '@budarin/vite-plugin-set-head-in-order';

export default defineConfig({
    plugins: [setHeadInOrderPlugin()],
});
```

### Что делает

- Обрабатывает только прямых потомков `head`.
- Классифицирует элементы по группам в порядке capo.js и пересобирает `head`, сохраняя исходный порядок элементов внутри каждой группы.

Ключевые моменты порядка:

- Синхронные скрипты (inline и простые внешние без async/defer/module) идут ДО любых preload.
- Синхронные стили (`link[rel="stylesheet"]`, `style`) стоят ПЕРЕД прелоадом стилей.
- Прелоад стилей — выше прелоада скриптов (`modulepreload`, `preload[as="script"]`).

### Порядок элементов в head (человеческим языком)

1. Базовые метаданные страницы: кодировка, служебные заголовки (http-equiv), настройки вьюпорта.
2. Базовый URL для ссылок (`<base>`), затем заголовок страницы (`<title>`).
3. Ранние настройки модулей: карта импортов (`importmap`).
4. Подсказки сети: установки соединения заранее (preconnect, dns-prefetch).
5. Блок стилей и скриптов в таком порядке:
    - Сначала инлайн‑скрипты (обычные, без async/defer/module).
    - Затем инлайн‑стили (`<style>`).
    - прелоад стилей (link rel="preload" as="style")
    - загрузка обычных таблиц стилей (link rel="stylesheet").
    - Затем прелоад скриптов (link rel="modulepreload" и preload as="script").
    - Затем загрузка скриптов: сначала обычные внешние (plain src), потом async/ES‑модули, затем defer.
6. Прочие прелоады ресурсов (шрифты, изображения и т.п.).
7. Остальное: прочие мета‑теги, иконки/манифест/предвыборка (prefetch, prerender).

Порядок внутри каждой группы НЕ меняется.

### Лицензия

MIT
