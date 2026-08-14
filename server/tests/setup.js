// Mock pg pool & email BEFORE any module loads.
// This lets unit/integration tests run WITHOUT a real Postgres server.

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_only_at_least_32_chars';
process.env.JWT_EXPIRE = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.CLIENT_URL = 'http://localhost:5173';

// --- Mock pg pool ---
// Each test will configure its own mock behavior by re-requiring modules
// after configuring `__setMockQueryHandler`.

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn()
};

mockPool.connect.mockImplementation(() => Promise.resolve({
  query: mockPool.query,
  release: jest.fn()
}));

jest.mock('../config/database', () => ({
  pool: mockPool,
  connectDatabase: jest.fn().mockResolvedValue(true)
}));

// --- Mock email config ---
jest.mock('../config/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-id' })
}));

// --- Mock sanitizer (passthrough) ---
jest.mock('../utils/sanitizer', () => ({
  sanitizeInput: (v) => String(v || '').trim()
}));

// --- Reset between tests ---
// NOTE: Don't jest.clearAllMocks() here because it destroys the mockReturnValue
// set up above. Each test file resets its own mocks in its beforeEach.
beforeEach(() => {
  mockPool.query.mockReset();
  mockPool.connect.mockReset();
  mockPool.connect.mockImplementation(() => Promise.resolve({
    query: mockPool.query,
    release: jest.fn()
  }));
});

global.mockPool = mockPool;
