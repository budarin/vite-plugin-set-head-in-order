import type { Plugin } from 'vite';
import * as cheerio from 'cheerio';

function setHeadinOrder(html: string): string {
    const $ = cheerio.load(html);
    const $head = $('head');

    if ($head.length === 0) return html;

    // Удаляем пробельные текстовые узлы в <head>
    $head.contents().each((_, node) => {
        if (node.type === 'text' && !(node.data || '').trim()) {
            $(node).remove();
        }
    });

    type GroupRule = {
        name: string;
        matches: (el: any, $wrap: cheerio.Cheerio<any>) => boolean;
    };

    // Правила групп в порядке capo.js. Порядок критичен.
    const RULES: GroupRule[] = [
        // 1) meta charset
        {
            name: 'meta-charset',
            matches: (_el, $el) => $el.is('meta[charset]'),
        },
        // 2) http-equiv (включая content-type, x-ua-compatible, csp и т.д.)
        {
            name: 'meta-http-equiv',
            matches: (_el, $el) => $el.is('meta[http-equiv]'),
        },
        // 3) viewport
        {
            name: 'meta-viewport',
            matches: (_el, $el) => $el.is('meta[name="viewport"]'),
        },
        // 4) base
        {
            name: 'base',
            matches: (_el, $el) => $el.is('base'),
        },
        // 5) title
        {
            name: 'title',
            matches: (_el, $el) => $el.is('title'),
        },
        // 6) importmap (располагается рано по capo)
        {
            name: 'script-importmap',
            matches: (_el, $el) => $el.is('script[type="importmap"]'),
        },
        // 7) resource hints: preconnect, dns-prefetch
        {
            name: 'link-preconnect',
            matches: (_el, $el) =>
                $el.is('link[rel="preconnect"], link[rel="dns-prefetch"]'),
        },
        // 8) ИНЛАЙН СКРИПТЫ (до инлайн-стилей и любых preload)
        {
            name: 'script-inline-plain',
            matches: (_el, $el) =>
                $el.is(
                    'script:not([src]):not([async]):not([defer]):not([type="module"]):not([type="importmap"])'
                ),
        },
        // 9) ИНЛАЙН СТИЛИ
        {
            name: 'style',
            matches: (_el, $el) => $el.is('style'),
        },
        // 10) PRELOAD СТИЛЕЙ
        {
            name: 'link-preload-style',
            matches: (_el, $el) => $el.is('link[rel="preload"][as="style"]'),
        },
        // 11) ЗАГРУЗКА СТИЛЕЙ
        {
            name: 'link-stylesheet',
            matches: (_el, $el) => $el.is('link[rel="stylesheet"]'),
        },
        // 12) PRELOAD СКРИПТОВ (modulepreload или preload as=script)
        {
            name: 'link-preload-script',
            matches: (_el, $el) =>
                $el.is(
                    'link[rel="modulepreload"], link[rel="preload"][as="script"]'
                ),
        },
        // 13) ПРОЧИЕ PRELOAD (шрифты/изображения/etc.)
        {
            name: 'link-preload-other',
            matches: (_el, $el) =>
                $el.is(
                    'link[rel="preload"]:not([as="style"]):not([as="script"])'
                ),
        },
        // 14) ЗАГРУЗКА СКРИПТОВ — обычные (plain) без async/defer/module
        {
            name: 'script-src-plain',
            matches: (_el, $el) =>
                $el.is(
                    'script[src]:not([async]):not([defer]):not([type="module"])'
                ),
        },
        // 15) ЗАГРУЗКА СКРИПТОВ — async/module
        {
            name: 'script-async-or-module',
            matches: (_el, $el) =>
                $el.is(
                    'script[async], script[type="module"][src], script[type="module"]'
                ),
        },
        // 16) ЗАГРУЗКА СКРИПТОВ — defer
        {
            name: 'script-defer',
            matches: (_el, $el) => $el.is('script[defer]'),
        },
        // 16) meta прочие
        {
            name: 'meta-other',
            matches: (_el, $el) => $el.is('meta'),
        },
        // 17) link prefetch/prerender/manifest/icons
        {
            name: 'link-prefetch-like',
            matches: (_el, $el) =>
                $el.is(
                    'link[rel="prefetch"], link[rel="prerender"], link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]'
                ),
        },
    ];

    const OTHER_GROUP_INDEX = RULES.length;

    function classify(el: any): number {
        const $el = $(el) as cheerio.Cheerio<any>;
        for (let i = 0; i < RULES.length; i++) {
            if (RULES[i].matches(el, $el)) return i;
        }
        return OTHER_GROUP_INDEX;
    }

    // Собираем элементы <head> по группам с сохранением исходного внутри-группового порядка
    const buckets: Array<any[]> = Array.from(
        { length: OTHER_GROUP_INDEX + 1 },
        () => []
    );
    $head.contents().each((_, node) => {
        if (node.type === 'comment') {
            $(node).remove();
            return;
        }
        if (
            node.type === 'tag' ||
            node.type === 'script' ||
            node.type === 'style'
        ) {
            const idx = classify(node as any);
            buckets[idx].push(node as any);
        }
        // Прочие типы (должны быть удалены ранее)
    });

    $head.empty();

    for (let i = 0; i < buckets.length; i++) {
        for (const node of buckets[i]) {
            $head.append(node);
        }
    }

    return $.html();
}

export function setHeadInOrderPlugin(): Plugin {
    return {
        name: 'vite-plugin-set-head-in-order',
        apply: 'build',
        enforce: 'post',
        transformIndexHtml(html: string) {
            return setHeadinOrder(html);
        },
    };
}

export default setHeadInOrderPlugin;
