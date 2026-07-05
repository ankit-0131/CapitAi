import { runMultiAgentAnalysis } from './src/agents/coordinator.js';

async function testSystem() {
  console.log('Starting CapitAI Integration Test...');
  console.log('Testing Stock Analysis multi-agent graph with TSLA...');

  const preferences = {
    investmentGoal: 'Long-Term Growth',
    investmentAmount: '10000',
    investmentHorizon: '5 Years',
    riskTolerance: 'Moderate',
    preferredInvestmentType: 'Public Companies',
    preferredSectors: 'AI, EV',
    excludedSectors: 'Tobacco'
  };

  try {
    const result = await runMultiAgentAnalysis({
      ticker: 'TSLA',
      userId: 'test-user-99',
      userPreferences: preferences,
      io: null // pass null as no Socket.io is running in this raw script
    });

    console.log('\n======================================');
    console.log('       INTEGRATION TEST SUCCESS');
    console.log('======================================');
    console.log(`Ticker: ${result.ticker}`);
    console.log(`Company: ${result.companyName}`);
    console.log(`Grade: ${result.recommendationGrade}`);
    console.log(`Investment Score: ${result.investmentScore}/10`);
    console.log(`Confidence Index: ${result.confidence}%`);
    console.log('\nScore Breakdown:');
    console.log(JSON.stringify(result.scoreBreakdown, null, 2));
    console.log('\nPros detected:');
    result.pros.forEach(p => console.log(`- ${p}`));
    console.log('\nCons detected:');
    result.cons.forEach(c => console.log(`- ${c}`));
    console.log('\nConsensus Verdict:');
    console.log(result.debate.verdict);
    console.log('======================================\n');
    
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed with error:', err.message);
    process.exit(1);
  }
}

testSystem();
