import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompanyNews, getStartupData, getLiveStockQuote } from './apiClients.js';

export const getCompanyNewsTool = tool(
  async ({ ticker }) => {
    try {
      const data = await getCompanyNews(ticker);
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching news for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getCompanyNews',
    description: 'Fetch recent market news articles, earnings reports headlines, and regulatory events associated with a company stock symbol.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  }
);

export const getMarketSentimentTool = tool(
  async ({ ticker }) => {
    try {
      const news = await getCompanyNews(ticker);
      if (!news || news.length === 0) {
        return JSON.stringify({ sentimentScore: 0.5, rating: 'Neutral', explanation: 'No recent news found to evaluate sentiment.' });
      }
      
      const score = news.reduce((acc, item) => acc + item.sentiment, 0) / news.length;
      let rating = 'Neutral';
      if (score >= 0.25) rating = 'Bullish';
      else if (score <= -0.25) rating = 'Bearish';

      return JSON.stringify({
        ticker,
        sentimentScore: parseFloat(score.toFixed(2)),
        rating,
        details: news.map(n => ({ title: n.title, sentiment: n.sentiment, source: n.source }))
      }, null, 2);
    } catch (err) {
      return `Error calculating sentiment for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getMarketSentiment',
    description: 'Analyze recent headlines and calculate aggregated market sentiment rating (Bullish, Bearish, Neutral) for a public company.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  }
);

export const getCompetitorsTool = tool(
  async ({ ticker }) => {
    try {
      const quote = await getLiveStockQuote(ticker);
      const sector = quote.sector || '';
      
      // Return predefined competitors or generic sector peers
      let list = ['General Competitor A', 'General Competitor B'];
      if (ticker === 'TSLA') list = ['BYD', 'NIO', 'RIVN', 'LCID', 'F', 'GM'];
      else if (ticker === 'AAPL') list = ['MSFT', 'GOOGL', 'Samsung', 'Xiaomi'];
      else if (ticker === 'MSFT') list = ['AAPL', 'GOOGL', 'AMZN', 'ORCL'];
      else if (ticker === 'GOOGL') list = ['MSFT', 'META', 'AAPL', 'AMZN'];
      else if (ticker === 'RELIANCE') list = ['Tata Consumer', 'Adani Enterprises', 'Airtel'];
      
      const peerData = await Promise.all(
        list.map(async sym => {
          try {
            const q = await getLiveStockQuote(sym);
            return { symbol: sym, name: q.name, price: q.price, cap: q.cap, pe: q.pe };
          } catch {
            return { symbol: sym, name: sym, price: 'N/A', cap: 'N/A', pe: 'N/A' };
          }
        })
      );

      return JSON.stringify({
        ticker,
        sector,
        competitors: peerData
      }, null, 2);
    } catch (err) {
      return `Error identifying competitors for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getCompetitors',
    description: 'Get key market competitors and sector peers, with relative valuation comparisons (prices, market cap, P/E ratio).',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  }
);

export const getStartupFundingTool = tool(
  async ({ name }) => {
    try {
      const data = await getStartupData(name);
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching startup funding info for ${name}: ${err.message}`;
    }
  },
  {
    name: 'getStartupFunding',
    description: 'Retrieve venture capital startup intelligence details including funding rounds, valuations, founder names, investors, and growth metrics.',
    schema: z.object({
      name: z.string().describe('The startup name (e.g. OpenAI, Stripe)')
    })
  }
);
