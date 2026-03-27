// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('lightweight-charts', () => {
  const buildSeries = () => ({
    setData: jest.fn(),
  });

  return {
    CandlestickSeries: 'CandlestickSeries',
    HistogramSeries: 'HistogramSeries',
    LineSeries: 'LineSeries',
    CrosshairMode: {
      Normal: 0,
    },
    createChart: jest.fn(() => ({
      addSeries: jest.fn(() => buildSeries()),
      priceScale: jest.fn(() => ({
        applyOptions: jest.fn(),
      })),
      panes: jest.fn(() => ([
        { setStretchFactor: jest.fn() },
        { setStretchFactor: jest.fn() },
      ])),
      subscribeCrosshairMove: jest.fn(),
      unsubscribeCrosshairMove: jest.fn(),
      applyOptions: jest.fn(),
      timeScale: jest.fn(() => ({
        fitContent: jest.fn(),
      })),
      remove: jest.fn(),
    })),
    createSeriesMarkers: jest.fn(() => ({
      setMarkers: jest.fn(),
      detach: jest.fn(),
    })),
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
