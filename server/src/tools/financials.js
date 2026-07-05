import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getLiveStockQuote, getStockHistory, getCompanyFinancials } from './apiClients.js';

export const getStockPriceTool = tool(
  async ({ ticker }) => {
    try {
      const data = await getLiveStockQuote(ticker);
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching stock price for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getStockPrice',
    description: 'Fetch the live/current stock price, percent changes, market cap, and primary stats for a given company ticker.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol (e.g. AAPL, TSLA, RELIANCE)')
    })
  }
);

export const getHistoricalPerformanceTool = tool(
  async ({ ticker, range = '1Y' }) => {
    try {
      const data = await getStockHistory(ticker, range);
      return JSON.stringify(data.slice(-10), null, 2) + `\nTotal data points: ${data.length}`;
    } catch (err) {
      return `Error fetching historical data for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getHistoricalPerformance',
    description: 'Fetch historical stock close prices for a symbol over a specific range (1M, 1Y, 5Y). Returns recent data points.',
    schema: z.object({
      ticker: z.string().describe('The stock symbol'),
      range: z.enum(['1M', '1Y', '5Y']).optional().describe('Historical duration range')
    })
  }
);

export const getCompanyFinancialsTool = tool(
  async ({ ticker }) => {
    try {
      const data = await getCompanyFinancials(ticker);
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching financials for ${ticker}: ${err.message}`;
    }
  },
  {
    name: 'getCompanyFinancials',
    description: 'Fetch detailed financial statements, including balance sheets and income statement historical sheets (revenue, debt, cash, equity, assets) over the last 4 years.',
    schema: z.object({
      ticker: z.string().describe('The stock ticker symbol')
    })
  }
);
