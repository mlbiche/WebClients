import { createElement } from '@proton/pass/utils/dom';

import { EXTENSION_PREFIX } from '../../constants';

export const isIFrameRootAttached = () =>
    document.querySelector<HTMLDivElement>(`#${EXTENSION_PREFIX}-iframe--root`) !== null;

export const createIframeRoot = (): HTMLDivElement => {
    const root = document.querySelector<HTMLDivElement>(`#${EXTENSION_PREFIX}-iframe--root`);

    if (root !== null) {
        return root;
    }

    const iframeRoot = createElement<HTMLDivElement>({
        type: 'aside',
        parent: document.body,
        attributes: { id: `${EXTENSION_PREFIX}-iframe--root` },
    });

    iframeRoot.style.position = 'absolute';
    iframeRoot.style.top = '0px';
    iframeRoot.style.left = '0px;';
    iframeRoot.style.width = '100%';
    iframeRoot.style.display = 'block';
    iframeRoot.style.border = '0';

    return iframeRoot;
};
