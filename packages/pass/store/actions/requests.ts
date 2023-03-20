import { ExtensionOrigin, TabId } from '@proton/pass/types';

export const boot = () => 'boot';
export const syncing = () => 'syncing';
export const wakeup = (origin: ExtensionOrigin, tabId: TabId) => `wakeup-${origin}-${tabId}`;

export const shares = () => 'shares';

export const vaultCreate = (vaultId: string) => `vault-create-request-${vaultId}`;
export const vaultEdit = (vaultId: string) => `vault-edit-request-${vaultId}`;
export const vaultDelete = (vaultId: string) => `vault-delete-request-${vaultId}`;

export const items = () => 'items';
export const importItems = () => `import-items`;

export const aliasOptions = () => `alias-options`;
export const aliasDetails = (aliasEmail: string) => `alias-details-${aliasEmail}`;
