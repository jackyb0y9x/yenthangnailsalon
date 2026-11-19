/**
 * Custom Opaque Assertion Matchers with Descriptive Error Messages
 */

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

class Expectation {
  private actual: any;
  private isNot: boolean;

  constructor(actual: any, isNot: boolean = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not(): Expectation {
    return new Expectation(this.actual, !this.isNot);
  }

  toBe(expected: any) {
    const pass = this.actual === expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(
        `Assertion failed:\nExpected ${this.isNot ? 'NOT ' : ''}: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(
          this.actual
        )}`
      );
    }
  }

  toEqual(expected: any) {
    const pass = deepEqual(this.actual, expected);
    if (this.isNot ? pass : !pass) {
      throw new Error(
        `Assertion failed for deep equality:\nExpected ${this.isNot ? 'NOT ' : ''}: ${JSON.stringify(
          expected
        )}\nReceived: ${JSON.stringify(this.actual)}`
      );
    }
  }

  toBeDefined() {
    const pass = this.actual !== undefined && this.actual !== null;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected value ${this.isNot ? 'NOT ' : ''}to be defined, but received: ${this.actual}`);
    }
  }

  toBeNull() {
    const pass = this.actual === null;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.isNot ? 'NOT ' : ''}null, but received: ${JSON.stringify(this.actual)}`);
    }
  }

  toBeTruthy() {
    const pass = !!this.actual;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.isNot ? 'NOT ' : ''}truthy value, but received: ${JSON.stringify(this.actual)}`);
    }
  }

  toBeFalsy() {
    const pass = !this.actual;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.isNot ? 'NOT ' : ''}falsy value, but received: ${JSON.stringify(this.actual)}`);
    }
  }

  toContain(item: any) {
    let pass = false;
    if (typeof this.actual === 'string') {
      pass = this.actual.includes(item);
    } else if (Array.isArray(this.actual)) {
      pass = this.actual.some((x) => deepEqual(x, item) || x === item);
    } else {
      throw new Error(`toContain called on non-string/non-array: ${typeof this.actual}`);
    }

    if (this.isNot ? pass : !pass) {
      throw new Error(
        `Expected ${this.isNot ? 'NOT ' : ''}to contain "${item}".\nActual: "${
          typeof this.actual === 'string' ? this.actual.slice(0, 150) : JSON.stringify(this.actual).slice(0, 150)
        }..."`
      );
    }
  }

  toMatch(regex: RegExp) {
    const pass = regex.test(String(this.actual));
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected "${this.actual}" ${this.isNot ? 'NOT ' : ''}to match regex ${regex}`);
    }
  }

  toBeGreaterThan(expected: number) {
    const pass = typeof this.actual === 'number' && this.actual > expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT ' : ''}> ${expected}`);
    }
  }

  toBeGreaterThanOrEqual(expected: number) {
    const pass = typeof this.actual === 'number' && this.actual >= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT ' : ''}>= ${expected}`);
    }
  }

  toBeLessThan(expected: number) {
    const pass = typeof this.actual === 'number' && this.actual < expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT ' : ''}< ${expected}`);
    }
  }

  toBeLessThanOrEqual(expected: number) {
    const pass = typeof this.actual === 'number' && this.actual <= expected;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT ' : ''}<= ${expected}`);
    }
  }

  toBeCloseTo(expected: number, delta: number = 0.01) {
    const pass = Math.abs(this.actual - expected) <= delta;
    if (this.isNot ? pass : !pass) {
      throw new Error(`Expected ${this.actual} ${this.isNot ? 'NOT ' : ''}to be close to ${expected} within delta ${delta}`);
    }
  }

  toThrow(expectedMessageOrRegex?: string | RegExp) {
    if (typeof this.actual !== 'function') {
      throw new Error('toThrow requires a function input');
    }
    let threw = false;
    let thrownError: any;
    try {
      this.actual();
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }

    if (this.isNot ? threw : !threw) {
      throw new Error(`Expected function ${this.isNot ? 'NOT ' : ''}to throw an error.`);
    }

    if (threw && expectedMessageOrRegex) {
      const msg = thrownError?.message || String(thrownError);
      if (typeof expectedMessageOrRegex === 'string') {
        if (!msg.includes(expectedMessageOrRegex)) {
          throw new Error(`Expected thrown error message to contain "${expectedMessageOrRegex}", got "${msg}"`);
        }
      } else if (expectedMessageOrRegex instanceof RegExp) {
        if (!expectedMessageOrRegex.test(msg)) {
          throw new Error(`Expected thrown error message to match ${expectedMessageOrRegex}, got "${msg}"`);
        }
      }
    }
  }
}

export function expect(actual: any) {
  return new Expectation(actual);
}

export function expectHtml(html: string) {
  return {
    toHaveLang(expectedLang: string) {
      const match = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
      if (!match || match[1] !== expectedLang) {
        throw new Error(`Expected HTML lang="${expectedLang}", got "${match ? match[1] : 'none'}"`);
      }
    },
    toHaveTitle(expectedSubstring: string) {
      const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (!match || !match[1].includes(expectedSubstring)) {
        throw new Error(`Expected <title> to contain "${expectedSubstring}", got "${match ? match[1] : 'none'}"`);
      }
    },
    toHaveMeta(nameOrProperty: string, expectedContent?: string) {
      const regex = new RegExp(`<meta\\s+[^>]*(?:name|property)=["']${nameOrProperty}["'][^>]*>`, 'i');
      const match = html.match(regex);
      if (!match) {
        throw new Error(`Expected meta tag with name/property="${nameOrProperty}"`);
      }
      if (expectedContent) {
        const contentMatch = match[0].match(/content=["']([^"']+)["']/i);
        if (!contentMatch || !contentMatch[1].includes(expectedContent)) {
          throw new Error(
            `Expected meta ${nameOrProperty} content to contain "${expectedContent}", got "${
              contentMatch ? contentMatch[1] : 'none'
            }"`
          );
        }
      }
    },
    toHaveHreflang(locale: string, expectedHrefSubstr?: string) {
      const regex = new RegExp(`<link[^>]*hreflang=["']${locale}["'][^>]*>`, 'i');
      if (!regex.test(html)) {
        throw new Error(`Expected hreflang="${locale}" link tag in HTML`);
      }
      if (expectedHrefSubstr) {
        const tag = html.match(regex)![0];
        if (!tag.includes(expectedHrefSubstr)) {
          throw new Error(`Expected hreflang="${locale}" tag to have href containing "${expectedHrefSubstr}", tag: ${tag}`);
        }
      }
    },
    toHaveJsonLd(expectedType: string, validateFn?: (data: any) => boolean) {
      const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let found = false;
      let match;
      const parsedObjects: any[] = [];
      while ((match = regex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          parsedObjects.push(parsed);
          const typeMatches =
            parsed['@type'] === expectedType ||
            (Array.isArray(parsed['@type']) && parsed['@type'].includes(expectedType));
          if (typeMatches) {
            if (!validateFn || validateFn(parsed)) {
              found = true;
              break;
            }
          }
        } catch (e) {}
      }
      if (!found) {
        throw new Error(
          `Expected JSON-LD script tag with @type="${expectedType}". Found ${parsedObjects.length} scripts: ${JSON.stringify(
            parsedObjects
          ).slice(0, 200)}`
        );
      }
    },
    toContainText(text: string) {
      if (!html.includes(text)) {
        throw new Error(`Expected HTML to contain text "${text}".`);
      }
    },
  };
}

export function expectResponse(res: { status: number; bodyText?: string; headers?: any }) {
  const bodyText = res.bodyText || '';
  return {
    toBeOk() {
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`Expected HTTP 2xx, got status ${res.status}. Body: ${bodyText.slice(0, 300)}`);
      }
    },
    toHaveStatus(code: number) {
      if (res.status !== code) {
        throw new Error(`Expected HTTP ${code}, got ${res.status}. Body: ${bodyText.slice(0, 300)}`);
      }
    },
    toHaveHeader(headerName: string, expectedValue?: string) {
      const val = res.headers?.get ? res.headers.get(headerName) : (res.headers as any)?.[headerName.toLowerCase()];
      if (!val) {
        throw new Error(`Expected header "${headerName}" to be present.`);
      }
      if (expectedValue && !val.includes(expectedValue)) {
        throw new Error(`Expected header "${headerName}" to contain "${expectedValue}", got "${val}"`);
      }
    },
    toHaveJsonBody(expectedPartialObject: any) {
      let json: any;
      try {
        json = JSON.parse(bodyText);
      } catch (e: any) {
        throw new Error(`Failed to parse response body as JSON: ${e.message}\nBody: ${bodyText.slice(0, 200)}`);
      }
      for (const [key, value] of Object.entries(expectedPartialObject)) {
        if (!deepEqual(json[key], value)) {
          throw new Error(
            `JSON property "${key}" mismatch.\nExpected: ${JSON.stringify(value)}\nReceived: ${JSON.stringify(json[key])}`
          );
        }
      }
    },
  };
}
