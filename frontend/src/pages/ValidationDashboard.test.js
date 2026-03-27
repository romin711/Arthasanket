import { render, screen, waitFor } from '@testing-library/react';
import ValidationDashboard from './ValidationDashboard';

jest.mock('../context/PortfolioContext', () => ({
  usePortfolio: jest.fn(),
}));

const { usePortfolio } = require('../context/PortfolioContext');

function buildValidationPayload() {
  return {
    hitRate: 0.61,
    hitRateCI95: [0.52, 0.69],
    sharpeRatio: 1.27,
    maxDrawdown: -0.083,
    signalCount: 40,
    successCount: 24,
    alertSampleCount: 12,
    liveOutcomeCount: 12,
    returnAttribution: {
      '1D': { mean: 0.22, ci95: [-0.11, 0.53] },
      '3D': { mean: 0.71, ci95: [0.12, 1.31] },
      '5D': { mean: 1.11, ci95: [0.28, 1.86] },
    },
    baselineComparison: {
      baselineAnnualReturn: 3,
      baselineCompoundedReturnPct: 2.1,
      strategyCompoundedReturnPct: 6.9,
      outperformancePct: 4.8,
      outperformanceRatio: 3.2,
      description: '4.8% better than baseline',
    },
    strategyByDecision: {
      BUY: {
        hitRate: 0.66,
        hitRateCI95: [0.53, 0.77],
        sampleSize: 18,
        confidence: 'moderate',
        returnAttribution: {
          '1D': { mean: 0.33 },
          '3D': { mean: 0.95 },
          '5D': { mean: 1.43 },
        },
        worstDrawdown: -0.091,
      },
      SELL: {
        hitRate: 0.57,
        hitRateCI95: [0.42, 0.71],
        sampleSize: 16,
        confidence: 'moderate',
        returnAttribution: {
          '1D': { mean: 0.12 },
          '3D': { mean: 0.41 },
          '5D': { mean: 0.98 },
        },
        worstDrawdown: -0.074,
      },
      HOLD: {
        hitRate: 0.53,
        hitRateCI95: [0.34, 0.71],
        sampleSize: 6,
        confidence: 'low',
        returnAttribution: {
          '1D': { mean: -0.02 },
          '3D': { mean: -0.09 },
          '5D': { mean: -0.24 },
        },
        worstDrawdown: -0.031,
      },
    },
    equityCurve: [
      { step: 0, strategy: 1, baseline: 1 },
      { step: 1, strategy: 1.03, baseline: 1.01 },
      { step: 2, strategy: 1.04, baseline: 1.01 },
      { step: 3, strategy: 1.06, baseline: 1.02 },
    ],
  };
}

describe('ValidationDashboard', () => {
  beforeEach(() => {
    usePortfolio.mockReturnValue({
      opportunityRadarHistory: [],
    });

    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/validation/performance')) {
        return {
          ok: true,
          json: async () => buildValidationPayload(),
        };
      }

      if (String(url).includes('/api/validation/strategy-breakdown')) {
        return {
          ok: true,
          json: async () => buildValidationPayload().strategyByDecision,
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders CI metrics, baseline comparison, and equity curve', async () => {
    render(<ValidationDashboard />);

    expect(await screen.findByText(/Validation Dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Hit Rate CI95/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Cumulative Equity Curve/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/equity curve chart/i)).toBeInTheDocument();
    expect(screen.getByText(/Live realized outcomes tracked:/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/validation/performance'));
    });
  });
});
