const assert = require("assert");
const {
  ChartImportError,
  normalizeChart,
} = require("../services/chartImporter");

describe("chart importer", () => {
  it("converts visible 4-key chart notes to playable notes", () => {
    const result = normalizeChart({
      strumLines: [
        {
          visible: true,
          keyCount: 4,
          notes: [
            { id: 0, time: 1000, sLen: 0, type: 0 },
            { id: 3, time: 2500, sLen: 500, type: 1 },
          ],
        },
      ],
    });

    assert.equal(result.keyCount, 4);
    assert.equal(result.noteCount, 2);
    assert.deepEqual(result.notes, [
      { id: 1, lane: 0, time: 1, sLen: 0 },
      { id: 4, lane: 3, time: 2.5, sLen: 0.5 },
    ]);
  });

  it("rejects charts that are not 4-key visible maps", () => {
    assert.throws(
      () =>
        normalizeChart({
          strumLines: [{ visible: true, keyCount: 5, notes: [] }],
        }),
      ChartImportError,
    );
  });
});
