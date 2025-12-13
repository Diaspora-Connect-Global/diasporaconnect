import { BodySmall, TextPrimary } from "../utils";
import { useTranslations } from 'next-intl';
import LocaleSwitcher from "@/components/LocalSwitcher"


export default function InfoLinks() {
    const t = useTranslations('legal');

    return (
        <>
            <LocaleSwitcher
                selectClassName="appearance-none text-text-primary"
                optionClassName="bg-surface-default"
            />
            <span >·</span>
            <a href="#" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('about')}
                    </TextPrimary>
                </BodySmall>
            </a>
            <span>·</span>
            <a href="#" className="hover:underline text-foreground flex-wrap">
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
            <span className="flex">
                <BodySmall>
                    <TextPrimary>
                        © Diaspo Plug {new Date().getFullYear()}
                    </TextPrimary>
                </BodySmall>
            </span>
        </>
    );
}
