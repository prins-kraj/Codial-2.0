#!/usr/bin/env ts-node

/**
 * Client Integration Test Runner
 * 
 * This script runs all client-side integration tests for the personal chat features.
 */

import { execSync } from 'child_process';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class ClientIntegrationTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async runTest(testFile: string): Promise<TestResult> {
    const testName = path.basename(testFile, '.test.tsx');
    const startTime = Date.now();

    try {
      console.log(`\n🧪 Running ${testName}...`);
      
      // Run the specific test file with vitest
      execSync(`npm test -- --run ${testFile}`, {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      const duration = Date.now() - startTime;
      const result: TestResult = {
        name: testName,
        passed: true,
        duration,
      };

      console.log(`✅ ${testName} passed (${duration}ms)`);
      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        name: testName,
        passed: false,
        duration,
        error: error.message,
      };

      console.log(`❌ ${testName} failed (${duration}ms)`);
      console.log(`   Error: ${error.message}`);
      return result;
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Client Integration Tests for Personal Chat Features\n');

    const testFiles = [
      'directMessaging.integration.test.tsx',
      'profileManagement.integration.test.tsx',
      'settingsManagement.integration.test.tsx',
      'messageEditing.integration.test.tsx',
    ];

    // Run each test file
    for (const testFile of testFiles) {
      const result = await this.runTest(testFile);
      this.results.push(result);
    }

    this.generateReport();
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed);
    const failedTests = this.results.filter(r => !r.passed);

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLIENT INTEGRATION TEST REPORT');
    console.log('='.repeat(60));

    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${this.results.length}`);
    console.log(`   Passed: ${passedTests.length}`);
    console.log(`   Failed: ${failedTests.length}`);
    console.log(`   Total Duration: ${totalDuration}ms`);

    if (passedTests.length > 0) {
      console.log(`\n✅ Passed Tests:`);
      passedTests.forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });
    }

    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      failedTests.forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      });
    }

    console.log('\n' + '='.repeat(60));

    // Test coverage by workflow
    this.generateWorkflowCoverage();

    // Exit with appropriate code
    process.exit(failedTests.length > 0 ? 1 : 0);
  }

  private generateWorkflowCoverage(): void {
    console.log('🎯 WORKFLOW COVERAGE REPORT');
    console.log('='.repeat(60));

    const workflows = [
      {
        name: 'Direct Messaging Workflow',
        description: 'User search → Start chat → Send messages → Real-time updates',
        tests: ['directMessaging.integration.test'],
        covered: this.results.some(r => r.name.includes('directMessaging') && r.passed),
      },
      {
        name: 'Profile Management Workflow',
        description: 'View profile → Edit profile → Upload picture → Update status',
        tests: ['profileManagement.integration.test'],
        covered: this.results.some(r => r.name.includes('profileManagement') && r.passed),
      },
      {
        name: 'Settings Management Workflow',
        description: 'Open settings → Change preferences → Update password → Save settings',
        tests: ['settingsManagement.integration.test'],
        covered: this.results.some(r => r.name.includes('settingsManagement') && r.passed),
      },
      {
        name: 'Message Editing Workflow',
        description: 'Edit message → Save changes → Delete message → Real-time sync',
        tests: ['messageEditing.integration.test'],
        covered: this.results.some(r => r.name.includes('messageEditing') && r.passed),
      },
    ];

    workflows.forEach(workflow => {
      const status = workflow.covered ? '✅' : '❌';
      console.log(`${status} ${workflow.name}`);
      console.log(`   ${workflow.description}`);
      workflow.tests.forEach(test => {
        const testResult = this.results.find(r => r.name.includes(test.split('.')[0]));
        const testStatus = testResult?.passed ? '✅' : '❌';
        console.log(`   ${testStatus} ${test}`);
      });
      console.log('');
    });

    const coveredWorkflows = workflows.filter(w => w.covered).length;
    const coveragePercentage = Math.round((coveredWorkflows / workflows.length) * 100);

    console.log(`📊 Workflow Coverage: ${coveragePercentage}% (${coveredWorkflows}/${workflows.length} workflows)`);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const runner = new ClientIntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Client test runner failed:', error);
    process.exit(1);
  });
}

export default ClientIntegrationTestRunner;