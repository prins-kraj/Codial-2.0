#!/usr/bin/env ts-node

/**
 * Integration Test Runner
 * 
 * This script runs all integration tests for the personal chat features.
 * It sets up the test environment, runs tests in sequence, and provides
 * comprehensive reporting.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class IntegrationTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async runTest(testFile: string): Promise<TestResult> {
    const testName = path.basename(testFile, '.test.ts');
    const startTime = Date.now();

    try {
      console.log(`\n🧪 Running ${testName}...`);
      
      // Run the specific test file
      execSync(`npm test -- ${testFile}`, {
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
    console.log('🚀 Starting Integration Tests for Personal Chat Features\n');

    const testFiles = [
      'directMessaging.integration.test.ts',
      'profileManagement.integration.test.ts',
      'settingsManagement.integration.test.ts',
      'messageEditing.integration.test.ts',
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
    console.log('📊 INTEGRATION TEST REPORT');
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

    // Test coverage by requirement
    this.generateCoverageReport();

    // Exit with appropriate code
    process.exit(failedTests.length > 0 ? 1 : 0);
  }

  private generateCoverageReport(): void {
    console.log('🎯 REQUIREMENT COVERAGE REPORT');
    console.log('='.repeat(60));

    const requirements = [
      {
        id: '1',
        name: 'Personal/Direct Messaging',
        tests: ['directMessaging.integration.test'],
        covered: this.results.some(r => r.name.includes('directMessaging') && r.passed),
      },
      {
        id: '2',
        name: 'User Profile Management',
        tests: ['profileManagement.integration.test'],
        covered: this.results.some(r => r.name.includes('profileManagement') && r.passed),
      },
      {
        id: '3',
        name: 'Settings Panel',
        tests: ['settingsManagement.integration.test'],
        covered: this.results.some(r => r.name.includes('settingsManagement') && r.passed),
      },
      {
        id: '4',
        name: 'Message Editing and Deletion',
        tests: ['messageEditing.integration.test'],
        covered: this.results.some(r => r.name.includes('messageEditing') && r.passed),
      },
      {
        id: '5',
        name: 'Enhanced User Interface',
        tests: ['directMessaging.integration.test', 'profileManagement.integration.test'],
        covered: this.results.some(r => 
          (r.name.includes('directMessaging') || r.name.includes('profileManagement')) && r.passed
        ),
      },
    ];

    requirements.forEach(req => {
      const status = req.covered ? '✅' : '❌';
      console.log(`${status} Requirement ${req.id}: ${req.name}`);
      req.tests.forEach(test => {
        const testResult = this.results.find(r => r.name.includes(test.split('.')[0]));
        const testStatus = testResult?.passed ? '✅' : '❌';
        console.log(`   ${testStatus} ${test}`);
      });
    });

    const coveredRequirements = requirements.filter(r => r.covered).length;
    const coveragePercentage = Math.round((coveredRequirements / requirements.length) * 100);

    console.log(`\n📊 Overall Coverage: ${coveragePercentage}% (${coveredRequirements}/${requirements.length} requirements)`);
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default IntegrationTestRunner;