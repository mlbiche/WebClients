import { c } from 'ttag';

import {
    SidebarListItem,
    SidebarListItemContent,
    SidebarListItemButton,
    SidebarListItemContentIcon,
    useModalState,
} from '@proton/components';
import { randomIntFromInterval } from '@proton/util/function';
import { ACCENT_COLORS, LABEL_TYPE } from '@proton/shared/lib/constants';

import { Label } from '@proton/shared/lib/interfaces/Label';
import EditLabelModal from '@proton/components/containers/labels/modals/EditLabelModal';

interface Props {
    onFocus: () => void;
}

const EmptyLabels = ({ onFocus }: Props) => {
    const [editLabelProps, setEditLabelModalOpen] = useModalState();

    const newLabel: Pick<Label, 'Name' | 'Color' | 'Type'> = {
        Name: '',
        Color: ACCENT_COLORS[randomIntFromInterval(0, ACCENT_COLORS.length - 1)],
        Type: LABEL_TYPE.MESSAGE_LABEL,
    };

    return (
        <SidebarListItem>
            <SidebarListItemButton
                onFocus={onFocus}
                data-shortcut-target="add-label"
                onClick={() => setEditLabelModalOpen(true)}
            >
                <SidebarListItemContent
                    right={<SidebarListItemContentIcon name="plus" color="white" />}
                    title={c('Title').t`Create a new label`}
                >
                    {c('Link').t`Add label`}
                </SidebarListItemContent>
            </SidebarListItemButton>
            <EditLabelModal label={newLabel} {...editLabelProps} />
        </SidebarListItem>
    );
};

export default EmptyLabels;
