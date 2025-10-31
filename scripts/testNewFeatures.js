const { execSync } = require('child_process');
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runTest(testFile, description) {
  log(`\n${'='.repeat(70)}`, colors.blue);
  log(`🧪 Testing: ${description}`, colors.bright);
  log(`${'='.repeat(70)}`, colors.blue);

  try {
    execSync(`npx hardhat test ${testFile}`, { stdio: 'inherit' });
    log(`\n✅ ${description} - PASSED`, colors.green);
    return true;
  } catch (error) {
    log(`\n❌ ${description} - FAILED`, colors.red);
    return false;
  }
}

async function main() {
  log('\n🚀 Running Tests for New Features\n', colors.bright);

  const tests = [
    {
      file: 'test/BatchTransactions.test.ts',
      description: 'Batch Transactions'
    },
    {
      file: 'test/ScheduledTransactions.test.ts',
      description: 'Scheduled Transactions'
    },
    {
      file: 'test/FlowActions.test.ts',
      description: 'Flow Actions'
    },
    {
      file: 'test/LendingProtocol.test.ts',
      description: 'Lending Protocol'
    }
  ];

  const results = [];

  for (const test of tests) {
    const passed = runTest(test.file, test.description);
    results.push({ ...test, passed });
  }

  // Summary
  log('\n' + '='.repeat(70), colors.blue);
  log('📊 TEST SUMMARY', colors.bright);
  log('='.repeat(70), colors.blue);

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const color = result.passed ? colors.green : colors.red;
    log(`${status} - ${result.description}`, color);
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  log(`\n📈 Total: ${passedCount}/${totalCount} test suites passed`, colors.bright);

  if (passedCount === totalCount) {
    log('\n🎉 All tests passed successfully!', colors.green);
    process.exit(0);
  } else {
    log('\n⚠️  Some tests failed. Please review the errors above.', colors.yellow);
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, colors.red);
  process.exit(1);
});
