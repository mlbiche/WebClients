import { WorkerStatus } from '@proton/pass/types';
import { oneOf } from '@proton/pass/utils/fp';

export const workerReady = oneOf(WorkerStatus.READY);
export const workerLoggedOut = oneOf(WorkerStatus.UNAUTHORIZED, WorkerStatus.RESUMING_FAILED);
export const workerErrored = oneOf(WorkerStatus.ERROR, WorkerStatus.RESUMING_FAILED);
export const workerStale = oneOf(WorkerStatus.IDLE);
export const workerBusy = oneOf(WorkerStatus.AUTHORIZING, WorkerStatus.BOOTING, WorkerStatus.RESUMING);
