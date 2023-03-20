import {
    CommittedFormSubmission,
    FormIdentifier,
    FormSubmission,
    FormSubmissionStatus,
    Maybe,
    Realm,
    TabId,
    WithAutoSavePromptOptions,
    WorkerMessageType,
} from '@proton/pass/types';
import { logger } from '@proton/pass/utils/logger';
import { merge } from '@proton/pass/utils/object';
import { parseSender } from '@proton/pass/utils/url';

import { canCommitSubmission, isSubmissionCommitted } from '../../shared/form';
import WorkerMessageBroker from '../channel';
import WorkerContext from '../context';
import { createMainFrameRequestTracker } from './main-frame.tracker';
import { createXMLHTTPRequestTracker } from './xmlhttp-request.tracker';

const isPartialFormData = ({ type, data }: Pick<FormSubmission, 'data' | 'type'>): boolean => {
    if (type === 'login') {
        return data.password === undefined || data.password.trim() === '';
    }

    return false;
};

const getFormId = (tabId: TabId, realm: Realm): FormIdentifier => `${tabId}:${realm}`;

export const createFormSubmissionTracker = () => {
    const submissions: Map<FormIdentifier, FormSubmission> = new Map();

    const get = (tabId: TabId, realm: string): FormSubmission | undefined => {
        const submission = submissions.get(getFormId(tabId, realm));
        if (submission && submission.realm === realm) {
            return submission;
        }
    };

    const stash = (tabId: TabId, realm: string, reason: string): void => {
        const formId = getFormId(tabId, realm);

        if (submissions.has(formId)) {
            logger.info(`[FormTracker::Stash]: on tab ${tabId} for realm "${realm}" {${reason}}`);
            submissions.delete(formId);
        }
    };

    const stage = (
        tabId: TabId,
        submission: Omit<FormSubmission, 'status' | 'partial'>,
        reason: string
    ): FormSubmission => {
        logger.info(`[FormTracker::Stage]: on tab ${tabId} for realm "${submission.realm}" {${reason}}`);

        const formId = getFormId(tabId, submission.realm);
        const pending = submissions.get(formId);

        if (pending !== undefined && pending.status === FormSubmissionStatus.STAGING) {
            const update = merge(pending, { ...submission, status: FormSubmissionStatus.STAGING });
            const staging = merge(update, { partial: isPartialFormData(update) });

            submissions.set(formId, staging);
            return staging;
        }

        const staging = merge(submission, {
            status: FormSubmissionStatus.STAGING,
            partial: isPartialFormData(submission),
        }) as FormSubmission;
        submissions.set(formId, staging);

        return staging;
    };

    const commit = (tabId: TabId, realm: string, reason: string): Maybe<CommittedFormSubmission> => {
        const formId = getFormId(tabId, realm);
        const pending = submissions.get(formId);

        if (pending !== undefined && pending.status === FormSubmissionStatus.STAGING) {
            logger.info(`[FormTracker::Commit] on tab ${tabId} for realm "${realm}" {${reason}}`);
            const commit = merge(pending, { status: FormSubmissionStatus.COMMITTED });

            if (canCommitSubmission(commit)) {
                submissions.set(formId, commit);
                return commit;
            }
        }
    };

    createMainFrameRequestTracker({
        onTabDelete: (tabId) => {
            submissions.forEach((_, key) => {
                if (key.startsWith(tabId.toString())) {
                    const [tabId, realm] = key.split(':');
                    stash(parseInt(tabId, 10), realm, 'TAB_DELETED');
                }
            });
        },
        onTabError: (tabId, realm) => realm && stash(tabId, realm, 'TAB_ERRORED'),
    });

    /**
     * TODO: on failed request we should send out
     * a message to the content-script : we should stash
     * only if there was a recent form submission - if
     * we directly stash we might get false positives
     */
    createXMLHTTPRequestTracker({
        shouldTakeRequest: (tabId, realm) => submissions.has(getFormId(tabId, realm)),
        onFailedRequest: (tabId, realm) => stash(tabId, realm, 'XMLHTTP_ERROR_DETECTED'),
    });

    WorkerMessageBroker.registerMessage(WorkerMessageType.STAGE_FORM_SUBMISSION, ({ payload, reason }, sender) => {
        const context = WorkerContext.get();
        const { type, data } = payload;

        if (context.getState().loggedIn) {
            const { tabId, realm, subdomain, url } = parseSender(sender);
            return { staged: stage(tabId, { realm, subdomain, url, type, data }, reason) };
        }

        throw new Error('Cannot stage submission while logged out');
    });

    WorkerMessageBroker.registerMessage(WorkerMessageType.STASH_FORM_SUBMISSION, ({ reason }, sender) => {
        const context = WorkerContext.get();

        if (context.getState().loggedIn) {
            const { tabId, realm } = parseSender(sender);
            stash(tabId, realm, reason);
            return true;
        }

        return false;
    });

    WorkerMessageBroker.registerMessage(WorkerMessageType.COMMIT_FORM_SUBMISSION, ({ reason }, sender) => {
        const context = WorkerContext.get();

        if (context.getState().loggedIn) {
            const { tabId, realm } = parseSender(sender);
            const committed = commit(tabId, realm, reason);

            if (committed !== undefined) {
                const promptOptions = context.autosave.resolvePromptOptions(committed);

                return promptOptions.shouldPrompt
                    ? { committed: merge(committed, { autosave: promptOptions }) }
                    : { committed: undefined };
            }

            throw new Error(`Cannot commit form submission for tab#${tabId} on realm "${realm}"`);
        }

        throw new Error('Cannot commit submission while logged out');
    });

    WorkerMessageBroker.registerMessage(WorkerMessageType.REQUEST_FORM_SUBMISSION, (_, sender) => {
        const context = WorkerContext.get();

        if (context.getState().loggedIn) {
            const { tabId, realm } = parseSender(sender);
            const submission = get(tabId, realm);
            const isCommitted = submission !== undefined && isSubmissionCommitted(submission);

            return {
                submission:
                    submission !== undefined
                        ? (merge(submission, {
                              autosave: isCommitted
                                  ? context.autosave.resolvePromptOptions(submission)
                                  : { shouldPrompt: false },
                          }) as WithAutoSavePromptOptions<FormSubmission>)
                        : submission,
            };
        }
        throw new Error('Cannot request submission while logged out');
    });

    const clear = () => {
        logger.info(`[FormTracker::clear]: removing every submission`);
        submissions.clear();
    };

    return { get, stage, stash, commit, clear };
};
