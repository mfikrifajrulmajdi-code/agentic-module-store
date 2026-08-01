export class Validator {
  static validateFields(obj: any, schema: Record<string, 'string' | 'number' | 'boolean' | 'object'>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return { valid: false, errors: ['Output is not an object'] };
    }

    for (const [key, type] of Object.entries(schema)) {
      if (!(key in obj)) {
        errors.push(`Missing field: ${key}`);
      } else if (typeof obj[key] !== type) {
        errors.push(`Field '${key}' expected type '${type}', got '${typeof obj[key]}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static parseJSON<T>(jsonStr: string): T | null {
    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  }
}
