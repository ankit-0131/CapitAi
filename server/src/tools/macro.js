import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMacroeconomicData, getSectorPerformance } from './apiClients.js';

export const getMacroeconomicIndicatorsTool = tool(
  async () => {
    try {
      const data = await getMacroeconomicData();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching macroeconomic data: ${err.message}`;
    }
  },
  {
    name: 'getMacroeconomicIndicators',
    description: 'Fetch global and country macroeconomic rates including historical Federal Reserve interest rates, inflation figures, annual GDP growth trends, and unemployment statistics.',
    schema: z.object({})
  }
);

export const getSectorPerformanceTool = tool(
  async () => {
    try {
      const data = await getSectorPerformance();
      return JSON.stringify(data, null, 2);
    } catch (err) {
      return `Error fetching sector performance metrics: ${err.message}`;
    }
  },
  {
    name: 'getSectorPerformance',
    description: 'Fetch comparative indices of sector-specific growth projections, relative market capitalization P/E evaluations, and risk classifications.',
    schema: z.object({})
  }
);
