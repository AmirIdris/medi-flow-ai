/**
 * User-Agent Rotator
 * Provides realistic browser User-Agent strings with weighted selection
 * Newer browsers are more likely to be selected
 */

export interface UserAgent {
  string: string;
  browser: string;
  version: string;
  os: string;
  weight: number; // Higher = more likely to be selected
}

/**
 * Real browser User-Agent strings
 * Sorted by recency (newer browsers have higher weights)
 */
export const USER_AGENTS: UserAgent[] = [
  // Chrome 121 (Latest - Highest Weight)
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "121",
    os: "Windows",
    weight: 100,
  },
  {
    string: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "121",
    os: "macOS",
    weight: 100,
  },
  {
    string: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "121",
    os: "Linux",
    weight: 95,
  },
  // Chrome 120
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "120",
    os: "Windows",
    weight: 90,
  },
  {
    string: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "120",
    os: "macOS",
    weight: 90,
  },
  // Chrome Mobile
  {
    string: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.6167.138 Mobile/15E148 Safari/604.1",
    browser: "Chrome",
    version: "121",
    os: "iOS",
    weight: 85,
  },
  {
    string: "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
    browser: "Chrome",
    version: "121",
    os: "Android",
    weight: 85,
  },
  // Firefox 122
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    browser: "Firefox",
    version: "122",
    os: "Windows",
    weight: 80,
  },
  {
    string: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0",
    browser: "Firefox",
    version: "122",
    os: "macOS",
    weight: 80,
  },
  // Firefox 121
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    browser: "Firefox",
    version: "121",
    os: "Windows",
    weight: 75,
  },
  // Safari 17
  {
    string: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    browser: "Safari",
    version: "17.2",
    os: "macOS",
    weight: 70,
  },
  {
    string: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    browser: "Safari",
    version: "17.2",
    os: "iOS",
    weight: 70,
  },
  // Edge 121
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    browser: "Edge",
    version: "121",
    os: "Windows",
    weight: 65,
  },
  // Opera
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0",
    browser: "Opera",
    version: "107",
    os: "Windows",
    weight: 60,
  },
  // Older Chrome versions (lower weight)
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "119",
    os: "Windows",
    weight: 50,
  },
  {
    string: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    browser: "Chrome",
    version: "118",
    os: "Windows",
    weight: 40,
  },
  // Mobile variants
  {
    string: "Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    browser: "Chrome",
    version: "120",
    os: "Android",
    weight: 60,
  },
  {
    string: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    browser: "Safari",
    version: "16.6",
    os: "iOS",
    weight: 50,
  },
];

/**
 * Get a random User-Agent based on weighted selection
 * Newer browsers are more likely to be selected
 */
export function getRandomUserAgent(): string {
  // Calculate total weight
  const totalWeight = USER_AGENTS.reduce((sum, ua) => sum + ua.weight, 0);
  
  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;
  
  // Select User-Agent based on weight
  for (const ua of USER_AGENTS) {
    random -= ua.weight;
    if (random <= 0) {
      return ua.string;
    }
  }
  
  // Fallback to first (highest weight)
  return USER_AGENTS[0].string;
}

/**
 * Get a User-Agent for a specific browser
 */
export function getUserAgentForBrowser(browser: string): string {
  const matching = USER_AGENTS.filter(ua => 
    ua.browser.toLowerCase() === browser.toLowerCase()
  );
  
  if (matching.length === 0) {
    return getRandomUserAgent();
  }
  
  // Return highest weight match
  return matching.sort((a, b) => b.weight - a.weight)[0].string;
}

/**
 * Get a mobile User-Agent
 */
export function getMobileUserAgent(): string {
  const mobile = USER_AGENTS.filter(ua => 
    ua.os === "iOS" || ua.os === "Android"
  );
  
  if (mobile.length === 0) {
    return getRandomUserAgent();
  }
  
  // Weighted selection from mobile UAs
  const totalWeight = mobile.reduce((sum, ua) => sum + ua.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const ua of mobile) {
    random -= ua.weight;
    if (random <= 0) {
      return ua.string;
    }
  }
  
  return mobile[0].string;
}

/**
 * Get a desktop User-Agent
 */
export function getDesktopUserAgent(): string {
  const desktop = USER_AGENTS.filter(ua => 
    ua.os === "Windows" || ua.os === "macOS" || ua.os === "Linux"
  );
  
  if (desktop.length === 0) {
    return getRandomUserAgent();
  }
  
  // Weighted selection from desktop UAs
  const totalWeight = desktop.reduce((sum, ua) => sum + ua.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const ua of desktop) {
    random -= ua.weight;
    if (random <= 0) {
      return ua.string;
    }
  }
  
  return desktop[0].string;
}
