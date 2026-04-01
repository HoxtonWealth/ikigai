type BrowserInfo = {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isInAppBrowser: boolean;
  inAppName: string | null;
};

export type MicErrorInfo = {
  title: string;
  message: string;
  steps: string[] | null;
  canRetry: boolean;
};

function detectBrowser(): BrowserInfo {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false, isFirefox: false, isInAppBrowser: false, inAppName: null };
  }

  const ua = navigator.userAgent;

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);

  let isInAppBrowser = false;
  let inAppName: string | null = null;

  if (/FBAN|FBAV/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'Facebook';
  } else if (/Instagram/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'Instagram';
  } else if (/LinkedInApp/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'LinkedIn';
  } else if (/Twitter|X-Twitter/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'X (Twitter)';
  } else if (/Snapchat/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'Snapchat';
  } else if (/TikTok/i.test(ua)) {
    isInAppBrowser = true;
    inAppName = 'TikTok';
  }

  return { isIOS, isAndroid, isSafari, isChrome, isFirefox, isInAppBrowser, inAppName };
}

/** Detecte si on est dans un navigateur integre (Instagram, Facebook, etc.) */
export function checkInAppBrowser(): MicErrorInfo | null {
  const browser = detectBrowser();
  if (!browser.isInAppBrowser) return null;

  const openIn = browser.isIOS ? 'Safari' : 'Chrome';
  return {
    title: `Le micro ne fonctionne pas dans ${browser.inAppName}`,
    message: `Le navigateur de ${browser.inAppName} ne permet pas d'utiliser le micro. Pour profiter de l'experience vocale, ouvrez cette page dans ${openIn}.`,
    steps: browser.isIOS
      ? [
          `Appuyez sur les trois points (···) en bas de votre ecran`,
          `Choisissez « Ouvrir dans Safari »`,
          `Une fois dans Safari, le micro sera disponible`,
        ]
      : [
          `Appuyez sur les trois points (⋮) en haut a droite de votre ecran`,
          `Choisissez « Ouvrir dans ${openIn} »`,
          `Une fois dans ${openIn}, le micro sera disponible`,
        ],
    canRetry: false,
  };
}

/** Verifie si l'API getUserMedia est disponible */
export function checkMediaDevicesAvailable(): MicErrorInfo | null {
  if (typeof navigator === 'undefined') return null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const browser = detectBrowser();
    const suggestion = browser.isIOS
      ? 'Ouvrez cette page dans Safari pour pouvoir utiliser le micro.'
      : 'Ouvrez cette page dans Chrome pour pouvoir utiliser le micro.';
    return {
      title: 'Votre navigateur ne supporte pas le micro',
      message: `Ce navigateur ne permet pas d'acceder au microphone. ${suggestion}`,
      steps: null,
      canRetry: false,
    };
  }

  return null;
}

/** Traduit une erreur getUserMedia en message clair adapte au navigateur */
export function interpretMicError(error: unknown): MicErrorInfo {
  const browser = detectBrowser();
  const err = error instanceof DOMException ? error : null;
  const errorName = err?.name || 'Unknown';

  // NotAllowedError — l'utilisateur a refuse, ou le navigateur a bloque le micro
  if (errorName === 'NotAllowedError') {
    if (browser.isIOS && browser.isSafari) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Vous avez bloque le micro pour ce site dans Safari. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Allez dans Reglages sur votre iPhone',
          'Faites defiler vers le bas et appuyez sur Safari',
          'Dans la section « Reglages des sites web », appuyez sur Microphone',
          'Choisissez « Autoriser » pour ce site',
          'Revenez sur cette page et appuyez sur « Reessayer le micro »',
        ],
        canRetry: true,
      };
    }

    if (browser.isIOS && browser.isChrome) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Vous avez bloque le micro pour Chrome. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Allez dans Reglages sur votre iPhone',
          'Faites defiler vers le bas et appuyez sur Chrome',
          'Activez le bouton a cote de Microphone',
          'Revenez sur cette page et appuyez sur « Reessayer le micro »',
        ],
        canRetry: true,
      };
    }

    if (browser.isAndroid && browser.isChrome) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Chrome a bloque le micro pour ce site. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Appuyez sur le petit cadenas a gauche de l\'adresse du site, tout en haut',
          'Appuyez sur « Autorisations »',
          'A cote de « Micro », choisissez « Autoriser »',
          'La page va se recharger automatiquement — reessayez ensuite',
        ],
        canRetry: true,
      };
    }

    // Chrome ordinateur
    if (browser.isChrome) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Chrome a bloque le micro pour ce site. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Cliquez sur le petit cadenas a gauche de l\'adresse, tout en haut du navigateur',
          'Dans le menu qui s\'ouvre, trouvez la ligne « Micro »',
          'Changez « Bloquer » en « Autoriser »',
          'Rechargez la page (Ctrl+R ou Cmd+R) puis reessayez',
        ],
        canRetry: true,
      };
    }

    // Safari ordinateur
    if (browser.isSafari) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Safari a bloque le micro pour ce site. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Dans la barre de menus en haut, cliquez sur Safari puis « Reglages pour ce site web... »',
          'A cote de « Microphone », selectionnez « Autoriser »',
          'Fermez la fenetre de reglages — le changement est immediat',
        ],
        canRetry: true,
      };
    }

    // Firefox
    if (browser.isFirefox) {
      return {
        title: 'L\'acces au micro a ete refuse',
        message: 'Firefox a bloque le micro pour ce site. Pour le reactiver, suivez ces etapes :',
        steps: [
          'Cliquez sur le petit cadenas a gauche de l\'adresse du site',
          'Cliquez sur « Supprimer cette autorisation » a cote du micro',
          'Rechargez la page (Ctrl+R ou Cmd+R)',
          'Firefox vous redemandera la permission — acceptez cette fois',
        ],
        canRetry: true,
      };
    }

    // Navigateur non identifie
    return {
      title: 'L\'acces au micro a ete refuse',
      message: 'Votre navigateur a bloque l\'acces au micro. Allez dans les parametres de votre navigateur, autorisez le micro pour ce site, puis rechargez la page.',
      steps: null,
      canRetry: true,
    };
  }

  // NotFoundError — pas de micro sur l'appareil
  if (errorName === 'NotFoundError') {
    return {
      title: 'Aucun microphone detecte',
      message: 'Votre appareil ne semble pas avoir de micro connecte. Si vous avez un casque ou un micro externe, branchez-le et reessayez.',
      steps: null,
      canRetry: true,
    };
  }

  // NotReadableError — le micro est deja pris par une autre app
  if (errorName === 'NotReadableError') {
    return {
      title: 'Le micro est deja utilise',
      message: 'Une autre application utilise votre micro en ce moment (un appel en cours, Zoom, Teams, etc.). Fermez-la puis reessayez.',
      steps: null,
      canRetry: true,
    };
  }

  // SecurityError — pas de HTTPS
  if (errorName === 'SecurityError') {
    return {
      title: 'Connexion non securisee',
      message: 'Le micro ne fonctionne que sur une connexion securisee (https://). Verifiez que l\'adresse du site commence bien par « https:// ».',
      steps: null,
      canRetry: false,
    };
  }

  // Erreur inconnue
  return {
    title: 'Le micro n\'a pas pu s\'activer',
    message: 'Quelque chose a empeche l\'acces au micro. Verifiez qu\'aucune autre app n\'utilise le micro, puis reessayez.',
    steps: null,
    canRetry: true,
  };
}
