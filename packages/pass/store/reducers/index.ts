import { Reducer, combineReducers } from 'redux';

import { or } from '@proton/pass/utils/fp';
import { merge } from '@proton/pass/utils/object';

import { bootSuccess, signoutSuccess, wakeupSuccess } from '../actions';
import { State } from '../types';
import addresses from './addresses';
import alias from './alias';
import events from './events';
import items from './items';
import request from './request';
import shares from './shares';
import user from './user';

export * from './addresses';
export * from './alias';
export * from './events';
export * from './items';
export * from './request';
export * from './shares';
export * from './user';

export const reducerMap = {
    alias,
    addresses,
    events,
    items,
    request,
    shares,
    user,
};

export const rootReducer = combineReducers(reducerMap);

const wrappedRootReducer: Reducer<State> = (state, action) => {
    if (signoutSuccess.match(action)) {
        return rootReducer(undefined, action);
    }

    /**
     * wakeupSuccess & bootSuccess actions both
     * act as state setters before the actions
     * are consumed by the underlying reducers.
     * This allows state synchronization accross
     * environments
     */
    return rootReducer(
        (() =>
            or(bootSuccess.match, wakeupSuccess.match)(action) ? merge(state ?? {}, action.payload.state) : state)(),
        action
    );
};

export default wrappedRootReducer;
