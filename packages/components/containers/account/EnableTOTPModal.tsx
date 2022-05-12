import { ReactNode, useState } from 'react';
import { c } from 'ttag';
import { setupTotp, TOTP_WRONG_ERROR } from '@proton/shared/lib/api/settings';
import { srpAuth } from '@proton/shared/lib/srp';
import { PASSWORD_WRONG_ERROR } from '@proton/shared/lib/api/auth';
import downloadFile from '@proton/shared/lib/helpers/downloadFile';
import { APPS } from '@proton/shared/lib/constants';
import { getApiError } from '@proton/shared/lib/api/helpers/apiErrorHelper';
import { getTOTPData } from '@proton/shared/lib/settings/twoFactor';
import { noop } from '@proton/util/function';
import { getKnowledgeBaseUrl } from '@proton/shared/lib/helpers/url';

import {
    Alert,
    Button,
    Href,
    InlineLinkButton,
    Loader,
    ModalProps,
    ModalTwo as Modal,
    ModalTwoHeader as ModalHeader,
    ModalTwoContent as ModalContent,
    ModalTwoFooter as ModalFooter,
    QRCode,
    Form,
} from '../../components';
import { useConfig, useNotifications, useLoading, useApi, useEventManager, useUser, useModals } from '../../hooks';

import PasswordTotpInputs from '../password/PasswordTotpInputs';
import AuthModal from '../password/AuthModal';

interface ModalProperties {
    section: ReactNode;
    cancelButtonText?: string | null;
    onCancel?: () => void;
    submitButtonText?: string;
    onSubmit?: () => void;
}

interface SetupTOTPResponse {
    TwoFactorRecoveryCodes: string[];
}

const STEPS = {
    INFO: 1,
    SCAN_CODE: 2,
    CONFIRM_CODE: 3,
    RECOVERY_CODES: 4,
};

const EnableTOTPModal = ({ onClose, ...rest }: ModalProps) => {
    const { APP_NAME } = useConfig();
    const [user] = useUser();
    const api = useApi();
    const { call } = useEventManager();
    const { createNotification } = useNotifications();
    const { createModal } = useModals();
    const [{ sharedSecret, uri = '', period, digits }] = useState(() => {
        return getTOTPData(user.Email || user.Name);
    });
    const [step, setStep] = useState(STEPS.INFO);
    const [manualCode, setManualCode] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [password, setPassword] = useState('');
    const [totp, setTotp] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [totpError, setTotpError] = useState('');
    const [loading, withLoading] = useLoading();

    const handleClose = loading ? noop : onClose;

    const {
        section,
        cancelButtonText,
        onCancel = handleClose,
        submitButtonText,
        onSubmit,
    } = ((): ModalProperties => {
        if (!sharedSecret) {
            return {
                section: <Loader />,
            };
        }

        if (step === STEPS.INFO) {
            const twoFactorAuthLink =
                APP_NAME === APPS.PROTONVPN_SETTINGS
                    ? 'https://protonvpn.com/support/two-factor-authentication'
                    : getKnowledgeBaseUrl('/two-factor-authentication-2fa');

            // translator: complete sentence is: If you have never used two-factor authentication before, we strongly recommend you <link>read our two-factor authentication Guide first</link>.
            const guideButton = (
                <Href key="0" url={twoFactorAuthLink}>{c('Info')
                    .t`read our two-factor authentication Guide first`}</Href>
            );

            return {
                section: (
                    <>
                        <div className="mb1">
                            {c('Info')
                                .t`This wizard will enable Two-Factor Authentication (2FA) on your Proton account. Two-factor authentication will make your Proton account more secure so we recommend enabling it.`}
                        </div>
                        <div className="mb1">
                            {
                                // translator: complete sentence is: If you have never used two-factor authentication before, we strongly recommend you <link>read our two-factor authentication Guide first</link>.
                                c('Info')
                                    .jt`If you have never used two-factor authentication before, we strongly recommend you ${guideButton}.`
                            }
                        </div>
                    </>
                ),
                onSubmit() {
                    setStep(STEPS.SCAN_CODE);
                },
            };
        }

        const handleSubmitScan = () => {
            setStep(STEPS.CONFIRM_CODE);
        };

        if (step === STEPS.SCAN_CODE && !manualCode) {
            const switchButton = (
                <InlineLinkButton data-testid="totp:manual-button" key="0" onClick={() => setManualCode(true)}>
                    {c('Info').t`Enter key manually instead`}
                </InlineLinkButton>
            );

            return {
                section: (
                    <>
                        <div className="mb1">
                            {c('Info')
                                .jt`Scan this code with your two-factor authentication device to set up your account. ${switchButton}.`}
                        </div>
                        <div className="text-center">
                            <QRCode value={uri} size={200} />
                        </div>
                    </>
                ),
                onSubmit: handleSubmitScan,
            };
        }

        if (step === STEPS.SCAN_CODE && manualCode) {
            const switchButton = (
                <InlineLinkButton key="0" onClick={() => setManualCode(false)}>
                    {c('Info').t`Scan QR code instead`}
                </InlineLinkButton>
            );

            return {
                section: (
                    <>
                        <div className="mb1">
                            {c('Info')
                                .jt`Manually enter this information into your two-factor authentication device to set up your account. ${switchButton}.`}
                        </div>
                        <div>
                            <div className="flex flex-justify-space-between mb0-5">
                                <div className="w20">{c('Label').t`Key`}</div>
                                <div className="w80 flex-align-self-center text-bold">
                                    <code data-testid="totp:secret-key">{sharedSecret}</code>
                                </div>
                            </div>
                            <div className="flex flex-justify-space-between mb0-5">
                                <div className="w20">{c('Label').t`Interval`}</div>
                                <div className="w80 flex-align-self-center text-bold">
                                    <code>{period}</code>
                                </div>
                            </div>
                            <div className="flex flex-justify-space-between mb0-5">
                                <div className="w20">{c('Label').t`Digits`}</div>
                                <div className="w80 flex-align-self-center text-bold">
                                    <code>{digits}</code>
                                </div>
                            </div>
                        </div>
                    </>
                ),
                onSubmit: handleSubmitScan,
            };
        }

        if (step === STEPS.CONFIRM_CODE) {
            const handleSubmit = async () => {
                try {
                    const apiConfig = setupTotp(sharedSecret, totp);
                    let result: SetupTOTPResponse;

                    // Signed into a public user as an admin, the password and totp are related to the admin and not the user
                    // so to clarify that we ask in another modal
                    if (user.isSubUser) {
                        result = await new Promise<SetupTOTPResponse>((resolve, reject) => {
                            createModal(
                                <AuthModal<SetupTOTPResponse>
                                    onClose={reject}
                                    onSuccess={({ result }) => resolve(result)}
                                    config={apiConfig}
                                />
                            );
                        });
                    } else {
                        result = await srpAuth<SetupTOTPResponse>({
                            api,
                            credentials: { password },
                            config: apiConfig,
                        });
                    }

                    await call();
                    createNotification({ text: c('Info').t`Two-factor authentication enabled` });
                    setRecoveryCodes(result.TwoFactorRecoveryCodes);
                    setStep(STEPS.RECOVERY_CODES);
                } catch (error: any) {
                    const { code, message } = getApiError(error);

                    setPasswordError('');
                    setTotpError('');

                    if (code === PASSWORD_WRONG_ERROR) {
                        setPasswordError(message);
                    }

                    if (code === TOTP_WRONG_ERROR) {
                        setTotpError(message);
                    }
                }
            };

            return {
                section: (
                    <PasswordTotpInputs
                        password={password}
                        // Password is asked for in a modal when signed into public user
                        setPassword={user.isSubUser ? undefined : setPassword}
                        passwordError={passwordError}
                        totp={totp}
                        setTotp={setTotp}
                        totpError={totpError}
                        showTotp
                    />
                ),
                cancelButtonText: c('Action').t`Back`,
                onCancel: () => {
                    setStep(STEPS.SCAN_CODE);
                },
                submitButtonText: c('Action').t`Submit`,
                onSubmit() {
                    void withLoading(handleSubmit());
                },
            };
        }

        if (step === STEPS.RECOVERY_CODES) {
            return {
                section: (
                    <>
                        <Alert className="mb1">
                            <span className="text-bold">{c('Info')
                                .t`Important: Please make sure you save the recovery codes. Otherwise you can permanently lose access to your account if you lose your two-factor authentication device.`}</span>
                            <br />
                            <br />
                            {c('Info')
                                .t`If you lose your two-factor-enabled device, these codes can be used instead of the 6-digit two-factor authentication code to log into your account. Each code can only be used once.`}
                        </Alert>
                        <div className="flex text-center">
                            {recoveryCodes.map((code) => {
                                return (
                                    <code data-testid="totp:recovery-code" key={code} className="w49 p0-5">
                                        {code}
                                    </code>
                                );
                            })}
                        </div>
                        <div className="text-center">
                            <Button
                                onClick={() => {
                                    const blob = new Blob([recoveryCodes.join('\r\n')], {
                                        type: 'text/plain;charset=utf-8',
                                    });
                                    const filename = 'proton_recovery_codes.txt';
                                    downloadFile(blob, filename);
                                }}
                            >
                                {c('Action').t`Download`}
                            </Button>
                        </div>
                    </>
                ),
                submitButtonText: c('Action').t`Ok`,
                onSubmit() {
                    onClose?.();
                },
                cancelButtonText: null,
            };
        }

        throw new Error('Unknown step');
    })();

    return (
        <Modal as={Form} onSubmit={onSubmit} onClose={handleClose} size="large" {...rest}>
            <ModalHeader title={c('Title').t`Set up two-factor authentication`} />
            <ModalContent>{section}</ModalContent>
            <ModalFooter>
                {cancelButtonText !== null ? (
                    <Button onClick={onCancel} disabled={loading}>
                        {cancelButtonText || c('Action').t`Cancel`}
                    </Button>
                ) : (
                    // Maintain submit button positioning
                    <div />
                )}
                <Button loading={loading} type="submit" color="norm">
                    {submitButtonText || c('Action').t`Next`}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default EnableTOTPModal;
