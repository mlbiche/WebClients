import type { VFC } from 'react';

import { TextAreaTwo } from '@proton/components/index';

import { InputControl, type InputControlProps } from './InputControl';

export type Props = InputControlProps<typeof TextAreaTwo>;

export const TextareaControl: VFC<Props> = (props) => (
    <InputControl<typeof TextAreaTwo> as={TextAreaTwo} autoGrow minRows={2} rows={15} className="resize-none" {...props} />
);
