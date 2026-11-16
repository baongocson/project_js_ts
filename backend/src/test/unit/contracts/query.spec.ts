import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parseListProjects } from '../../../modules/projects/dto/project.validation';
import { parseSummaryQuery, parseDistributionQuery, parseCorrelationQuery, parseValueCountsQuery } from '../../../modules/analysis/dto/analysis-query.validation';
import { parseHistoryQuery } from '../../../modules/history/dto/history.validation';


describe('contracts/query contracts (unit)', () => {
    test('query grammar rejects repeated/unknown fields and typed string coercion traps', () => {
        assert.equal(parseListProjects({}).sort, '-updatedAt');
        assert.equal(parseListProjects({ sort: 'name', lifecycle: 'empty' }).lifecycle, 'empty');
        for (const query of [{ page: '01' }, { page: ['1', '2'] }, { limit: '101' }, { sort: 'unknown' }, { foo: 'x' }, { lifecycle: 'deleting' }])
            assert.throws(() => parseListProjects(query));
        assert.equal(parseValueCountsQuery({ includeMissing: 'false' }).includeMissing, false);
        assert.throws(() => parseValueCountsQuery({ includeMissing: 'FALSE' }));
        assert.throws(() => parseValueCountsQuery({ includeMissing: ['true', 'false'] }));
        assert.equal(parseSummaryQuery({ outlierMethod: 'zscore' }).outlierThreshold, 3);
        assert.equal(parseSummaryQuery({ outlierThreshold: '1e-3' }).outlierThreshold, 0.001);
        assert.throws(() => parseSummaryQuery({ threshold: '3' })); // Preserve existing summary field name.
        assert.throws(() => parseSummaryQuery({ outlierThreshold: '1e999' }));
        assert.equal(parseDistributionQuery({ bins: '250' }).bins, 250); // No new bins=100 cap.
        assert.equal(parseCorrelationQuery({}).method, 'pearson');
        assert.throws(() => parseCorrelationQuery({ method: 'category' }));
        assert.equal(parseHistoryQuery({}).limit, 20);
        assert.throws(() => parseHistoryQuery({ kind: ['process', 'restore'] }));
    });
});
