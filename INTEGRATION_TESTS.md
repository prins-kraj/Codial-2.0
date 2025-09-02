# Integration Tests Documentation

This document describes the comprehensive integration tests for the personal chat features implementation.

## Overview

The integration tests validate complete user workflows across the entire application stack, ensuring that all components work together correctly to deliver the required functionality.

## Test Structure

### Server-Side Integration Tests

Located in `server/src/__tests__/integration/`

#### 1. Direct Messaging Integration Tests
**File:** `directMessaging.integration.test.ts`

**Workflows Tested:**
- Complete direct messaging flow (send → receive → reply)
- Real-time messaging with Socket.IO
- Conversation management and switching
- Unread message indicators
- Message delivery and persistence
- Authorization and privacy controls

**Key Test Cases:**
- ✅ End-to-end message sending and receiving
- ✅ Real-time socket event handling
- ✅ Conversation list management
- ✅ Unauthorized access prevention
- ✅ Message persistence across sessions

#### 2. Profile Management Integration Tests
**File:** `profileManagement.integration.test.ts`

**Workflows Tested:**
- Profile viewing (own vs others)
- Profile editing and updates
- Profile picture upload
- User status management
- Profile validation and error handling

**Key Test Cases:**
- ✅ Complete profile update workflow
- ✅ Profile picture upload and storage
- ✅ Status updates and broadcasting
- ✅ Read-only profile viewing for other users
- ✅ Profile data validation
- ✅ Permission controls

#### 3. Settings Management Integration Tests
**File:** `settingsManagement.integration.test.ts`

**Workflows Tested:**
- Settings retrieval and display
- Settings updates and persistence
- Password change workflow
- Settings validation
- Cross-session persistence

**Key Test Cases:**
- ✅ Complete settings management flow
- ✅ Password change with validation
- ✅ Settings persistence across sessions
- ✅ Partial settings updates
- ✅ Data validation and error handling
- ✅ User isolation (can't access others' settings)

#### 4. Message Editing Integration Tests
**File:** `messageEditing.integration.test.ts`

**Workflows Tested:**
- Room message editing and deletion
- Direct message editing and deletion
- Real-time edit/delete broadcasting
- Permission controls
- Edit history tracking

**Key Test Cases:**
- ✅ Complete message editing workflow
- ✅ Message deletion with confirmation
- ✅ Real-time edit broadcasting across clients
- ✅ Permission validation (own messages only)
- ✅ Edit history preservation
- ✅ Socket event handling for edits/deletes

### Client-Side Integration Tests

Located in `client/src/__tests__/integration/`

#### 1. Direct Messaging Integration Tests
**File:** `directMessaging.integration.test.tsx`

**Workflows Tested:**
- User search and chat initiation
- Conversation list display and management
- Message sending and receiving UI
- Real-time message updates
- Error handling and loading states

**Key Test Cases:**
- ✅ Complete user search → start chat → send message flow
- ✅ Real-time message receiving and display
- ✅ Conversation switching and state management
- ✅ Unread message indicators
- ✅ Error handling for failed operations
- ✅ Loading states and empty states

#### 2. Profile Management Integration Tests
**File:** `profileManagement.integration.test.tsx`

**Workflows Tested:**
- Profile modal display and editing
- Profile picture upload UI
- Status updates through UI
- Profile validation and error display
- Integration with direct messaging

**Key Test Cases:**
- ✅ Complete profile viewing and editing flow
- ✅ Profile picture upload workflow
- ✅ Status update UI interactions
- ✅ Read-only vs editable profile modes
- ✅ Form validation and error display
- ✅ Profile → start chat integration

#### 3. Settings Management Integration Tests
**File:** `settingsManagement.integration.test.tsx`

**Workflows Tested:**
- Settings modal navigation (tabs)
- Settings form interactions
- Password change form
- Theme application
- Settings persistence in UI

**Key Test Cases:**
- ✅ Complete settings management flow
- ✅ Tabbed interface navigation
- ✅ Password change workflow with validation
- ✅ Theme changes and application
- ✅ Settings persistence across modal sessions
- ✅ Form validation and error handling

#### 4. Message Editing Integration Tests
**File:** `messageEditing.integration.test.tsx`

**Workflows Tested:**
- Message action menu display
- Inline message editing
- Message deletion confirmation
- Real-time edit/delete updates
- Keyboard shortcuts for editing

**Key Test Cases:**
- ✅ Complete message editing flow
- ✅ Message deletion with confirmation
- ✅ Keyboard shortcuts (Escape, Ctrl+Enter)
- ✅ Real-time edit/delete event handling
- ✅ Permission-based action display
- ✅ Error handling for failed operations

## Requirements Coverage

### Requirement 1: Personal/Direct Messaging
- **Server Tests:** ✅ `directMessaging.integration.test.ts`
- **Client Tests:** ✅ `directMessaging.integration.test.tsx`
- **Coverage:** Complete workflow from user search to message delivery

### Requirement 2: User Profile Management
- **Server Tests:** ✅ `profileManagement.integration.test.ts`
- **Client Tests:** ✅ `profileManagement.integration.test.tsx`
- **Coverage:** Profile CRUD operations, picture upload, status management

### Requirement 3: Settings Panel
- **Server Tests:** ✅ `settingsManagement.integration.test.ts`
- **Client Tests:** ✅ `settingsManagement.integration.test.tsx`
- **Coverage:** Settings management, password changes, persistence

### Requirement 4: Message Editing and Deletion
- **Server Tests:** ✅ `messageEditing.integration.test.ts`
- **Client Tests:** ✅ `messageEditing.integration.test.tsx`
- **Coverage:** Edit/delete for both room and direct messages

### Requirement 5: Enhanced User Interface
- **Server Tests:** ✅ Covered across all test files
- **Client Tests:** ✅ Covered across all test files
- **Coverage:** UI interactions, navigation, real-time updates

## Running the Tests

### Server Integration Tests

```bash
# Run all server integration tests
cd server
npm test -- --testPathPattern=integration

# Run specific test file
npm test -- directMessaging.integration.test.ts

# Run with coverage
npm test -- --coverage --testPathPattern=integration

# Run integration test runner
npm run test:integration
```

### Client Integration Tests

```bash
# Run all client integration tests
cd client
npm test -- --run src/__tests__/integration

# Run specific test file
npm test -- --run directMessaging.integration.test.tsx

# Run with UI
npm run test:ui -- src/__tests__/integration

# Run integration test runner
npm run test:integration
```

### Full Integration Test Suite

```bash
# Run both server and client integration tests
npm run test:integration:all
```

## Test Environment Setup

### Prerequisites
- Test database configured (separate from development)
- Redis instance for testing (if applicable)
- All dependencies installed
- Environment variables configured for testing

### Database Setup
```bash
# Server setup
cd server
npm run db:reset  # Reset test database
npm run db:migrate  # Apply migrations
```

### Mock Configuration
- API calls mocked in client tests
- Socket.IO events mocked for isolated testing
- File upload functionality mocked
- External services mocked

## Test Data Management

### Test Users
- Consistent test user creation across tests
- Proper cleanup between test runs
- Isolated test data per test case

### Test Messages
- Predefined message structures
- Various message types (text, edited, deleted)
- Real-time event simulation

### Test Settings
- Default settings configurations
- Various theme and preference combinations
- Password change scenarios

## Continuous Integration

### GitHub Actions Integration
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run server integration tests
        run: cd server && npm run test:integration
      - name: Run client integration tests
        run: cd client && npm run test:integration
```

## Performance Considerations

### Test Execution Time
- Parallel test execution where possible
- Optimized database operations
- Efficient test data setup/teardown

### Resource Usage
- Memory-efficient test data
- Proper cleanup of resources
- Isolated test environments

## Troubleshooting

### Common Issues
1. **Database Connection Errors**
   - Ensure test database is running
   - Check connection strings
   - Verify migrations are applied

2. **Socket Connection Issues**
   - Check port availability
   - Verify socket server startup
   - Review timeout configurations

3. **File Upload Tests**
   - Ensure upload directories exist
   - Check file permissions
   - Verify mock file creation

### Debug Mode
```bash
# Run tests with debug output
DEBUG=* npm test -- integration

# Run specific test with verbose output
npm test -- --verbose directMessaging.integration.test.ts
```

## Maintenance

### Regular Updates
- Update test data as features evolve
- Maintain mock configurations
- Review and update assertions
- Keep documentation current

### Test Coverage Goals
- Maintain >90% integration test coverage
- Cover all critical user workflows
- Include error scenarios and edge cases
- Validate real-time functionality

## Reporting

### Test Reports
- Automated test result reporting
- Coverage reports generation
- Performance metrics tracking
- Failure analysis and trends

### Metrics Tracked
- Test execution time
- Coverage percentages
- Failure rates
- Workflow completion rates