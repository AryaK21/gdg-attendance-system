import { useState, useEffect } from 'react';

const useInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (already installed)
        const isInStandaloneMode = () =>
            ('standalone' in window.navigator) && (window.navigator.standalone);
        const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;

        setIsStandalone(isInStandaloneMode() || isDisplayStandalone);

        // Check if device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const promptToInstall = async () => {
        if (!deferredPrompt) {
            return false;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        return outcome === 'accepted';
    };

    return { deferredPrompt, isIOS, isStandalone, promptToInstall };
};

export default useInstallPrompt;
