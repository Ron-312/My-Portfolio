import { useCallback, useEffect, useState, type RefObject } from 'react';

interface FullscreenElement extends HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
}

/**
 * Fullscreen for an element, including Safari's prefixed API. iPhone Safari
 * ignores the Fullscreen API entirely, so there `isFullscreen` just flips and
 * the caller is expected to fake it with a fixed, full-viewport layout.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>, fakeIt: boolean) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const onChange = () => {
            const doc = document as FullscreenDocument;
            setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = ref.current as FullscreenElement | null;
        if (!el) return;
        if (fakeIt || !(el.requestFullscreen || el.webkitRequestFullscreen)) {
            setIsFullscreen(v => !v);
            return;
        }
        const doc = document as FullscreenDocument;
        if (doc.fullscreenElement || doc.webkitFullscreenElement) {
            void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        } else {
            void (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
        }
    }, [ref, fakeIt]);

    return { isFullscreen, toggleFullscreen };
}
