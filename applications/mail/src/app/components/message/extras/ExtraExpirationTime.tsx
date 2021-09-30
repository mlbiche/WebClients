import { classnames, Icon } from '@proton/components';

import { Element } from '../../../models/element';
import { MessageExtended } from '../../../models/message';
import { useExpiration } from '../../../hooks/useExpiration';

interface Props {
    message: MessageExtended;
    marginBottom?: boolean;
}

const ExtraExpirationTime = ({ message, marginBottom = true }: Props) => {
    const [isExpiration, delayMessage] = useExpiration(message);
    const isExpiringDraft = !!message.expiresIn;

    if (!isExpiration) {
        return null;
    }

    return (
        <div
            className={classnames([
                'rounded p0-5 flex flex-nowrap',
                isExpiringDraft ? 'bg-primary' : 'bg-warning',
                marginBottom && 'mb0-5',
            ])}
            data-testid="expiration-banner"
        >
            <Icon name="hourglass-empty" className="flex-item-noshrink mtauto mbauto" />
            <span className="pl0-5 pr0-5 flex-item-fluid">{delayMessage}</span>
        </div>
    );
};

export default ExtraExpirationTime;
