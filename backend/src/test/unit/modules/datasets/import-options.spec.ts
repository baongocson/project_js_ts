import { test, describe } from '@jest/globals';
import assert from 'node:assert/strict';
import { parseImportOptions } from '../../../../modules/datasets/dto/import-options.dto';


describe('modules/datasets/import-options contracts (unit)', () => {
    test('import options accept explicit text type overrides without adding row caps', () => {
        assert.equal(parseImportOptions(undefined).delimiter, ',');
        assert.equal(parseImportOptions('{"delimiter":"tab"}').delimiter, '\t');
        const options = parseImportOptions({ columnTypes: [{ position: 0, logicalType: 'text' }] });
        assert.ok(options.columnTypes);
        assert.equal(options.columnTypes[0].logicalType, 'text');
        assert.throws(() => parseImportOptions(null));
        assert.throws(() => parseImportOptions('{'));
        assert.throws(() => parseImportOptions({ columnTypes: [{ position: 0, logicalType: 'text' }, { position: 0, logicalType: 'number' }] }));
        assert.throws(() => parseImportOptions({ rowLimit: 100000 }));
    });
});
