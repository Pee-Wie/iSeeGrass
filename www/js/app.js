export function normalizePagePath(path = window.location.pathname) {
  const pathname = new URL(path, window.location.href).pathname;
  const cleaned = pathname.replace(/\/+$/, '');

  if (!cleaned || cleaned === '/') {
    return '/index.html';
  }

  return cleaned;
}

export function getNavigationMode() {
  const current = normalizePagePath();

  if (current.includes('/public/')) {
    return 'public';
  }

  if (current.includes('/views/')) {
    return 'views';
  }

  return 'root';
}

export function getNavHref(targetKey) {
  const mode = getNavigationMode();
  const navMap = {
    root: {
      home: 'index.html',
      // explore: 'public/explore.html',
      about: 'public/about.html',
      contact: 'public/contacts.html',
      login: 'views/auth/login.html'
    },
    public: {
      home: '../index.html',
      // explore: '../public/explore.html',
      about: 'about.html',
      contact: 'contacts.html',
      login: '../views/auth/login.html'
    },
    views: {
      home: '../../index.html',
      // explore: '../../public/explore.html',
      about: '../../public/about.html',
      contact: '../../public/contacts.html',
      login: '../auth/login.html'
    }
  };

  return navMap[mode]?.[targetKey] ?? navMap.root[targetKey];
}

export function getLinkConfig() {
  return [
    { label: 'Home', href: getNavHref('home') },
    // { label: 'Explore Seagrass', href: getNavHref('explore') },
    { label: 'About us', href: getNavHref('about') },
    { label: 'Contact', href: getNavHref('contact') },
    { label: 'Sign In', href: getNavHref('login'), className: 'btn btn-secondary nav-cta' }
  ];
}

export function applyActiveNavigation(root = document) {
  const currentPage = normalizePagePath();

  root.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');

    if (!href || href.startsWith('#')) {
      return;
    }

    const resolved = normalizePagePath(new URL(href, window.location.href).pathname);

    if (resolved === currentPage) {
      link.classList.add('active');
    }
  });
}
