import { WithAutoSavePromptOptions } from './autosave';
import { Realm, TabId } from './runtime';

export type FormIdentifier = `${TabId}:${Realm}`;

export enum FormEntryStatus {
    STAGING,
    COMMITTED,
}

export type FormEntryBase = {
    realm: Realm;
    subdomain: string | null;
    url: string;
    type: 'login' | 'register';
    action?: string /* form action attribute */;
};

export type FormEntryData = FormEntryBase &
    (
        | {
              partial: true;
              data: { username: string; password: undefined };
          }
        | {
              partial: false;
              data: { username: string; password: string };
          }
    );

export type NewFormEntry = Pick<FormEntryData, 'data' | 'action' | 'type'>;

export type FormEntry<T extends FormEntryStatus = FormEntryStatus> = Extract<
    | ({
          status: FormEntryStatus.STAGING;
      } & FormEntryData)
    | ({
          status: FormEntryStatus.COMMITTED;
      } & Extract<FormEntryData, { partial: false }>),
    { status: T }
>;

export type PromptedFormEntry = WithAutoSavePromptOptions<FormEntry<FormEntryStatus.COMMITTED>, true>;
