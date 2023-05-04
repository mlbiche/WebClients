import { c } from 'ttag';

import { NewFeatureTag } from '@proton/components';

import { DecryptedLink } from '../../../../store';
import { useRevisionsModal } from '../../../modals/RevisionsModal/RevisionsModal';
import ContextMenuButton from '../ContextMenuButton';

interface Props {
    selectedLink: DecryptedLink;
    showRevisionsModal: ReturnType<typeof useRevisionsModal>[1];
    close: () => void;
}

const RevisionsButton = ({ selectedLink, showRevisionsModal, close }: Props) => {
    return (
        <ContextMenuButton
            name={c('Action').t`See version history`}
            icon="clock-rotate-left"
            testId="context-menu-revisions"
            action={() => showRevisionsModal({ link: selectedLink })}
            close={close}
        >
            {/*// TODO: Remove this after the 22/06/2023*/}
            <NewFeatureTag featureKey="revisions" showOnce endDate={new Date('2023-06-22')} className="ml-12" />
        </ContextMenuButton>
    );
};

export default RevisionsButton;
