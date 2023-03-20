import uniqid from 'uniqid';

import { OptimisticState } from '../types';
import { TestState, createTestOptimisticHistoryItem } from '../utils/testing.utils';
import { failReducer } from './fail';

describe('optimistic fail reducer', () => {
    test('should return original optimistic state if optimisticId is not found in history', () => {
        jest.spyOn(console, 'error').mockImplementationOnce(jest.fn());

        const optimistic: OptimisticState<TestState> = {
            checkpoint: { items: [] },
            history: [createTestOptimisticHistoryItem('add', 1)],
        };

        const result = failReducer(optimistic, uniqid());
        expect(result).toEqual(optimistic);
    });

    test('should flag optimistic history item as failed', () => {
        const optimisticUpdate = createTestOptimisticHistoryItem('add', 1);

        const optimistic: OptimisticState<TestState> = {
            checkpoint: { items: [0] },
            history: [optimisticUpdate],
        };

        const result = failReducer(optimistic, optimisticUpdate.id);

        expect(result).toEqual({
            ...optimistic,
            history: [{ ...optimisticUpdate, failed: true }],
        });
    });
});
