import { BodySmall, TextPrimary } from "../utils";
import { useTranslations } from 'next-intl';

export default function InfoLinks() {
    const t = useTranslations('legal');
    
    return (
        <>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('about')}
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('terms')}
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('privacyPolicy')}
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('contact')}
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <span>
                <BodySmall>
                    <TextPrimary>
                        © Diaspo Plug {new Date().getFullYear()}
                    </TextPrimary>
                </BodySmall>
            </span>
        </>
    );
}
