
// Register data ke liye rules
export const registerSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email' }, // Valid email hona chahiye
      password: { type: 'string', minLength: 6 }, // Kam se kam 6 chars
      name: { type: 'string' }
    }
  }
}

// Login data ke liye rules
export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' }
    }
  }
}