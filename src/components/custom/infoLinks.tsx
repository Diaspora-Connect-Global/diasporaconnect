import { BodySmall, TextPrimary } from "../utils";
import { useTranslations } from 'next-intl';
import LocaleSwitcher from "@/components/LocalSwitcher"
import { Link } from "@/i18n/navigation";


export default function InfoLinks() {
    const t = useTranslations('legal');

    return (
        <>
            <LocaleSwitcher
                selectClassName="appearance-none text-text-primary"
                optionClassName="bg-surface-default"
            />
            <span >·</span>
            <Link href="/about" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('about')}
                    </TextPrimary>
                </BodySmall>
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline text-foreground flex-wrap">
                <BodySmall>
                    <TextPrimary>
                        {t('terms')}
                    </TextPrimary>
                </BodySmall>
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('privacyPolicy')}
                    </TextPrimary>
                </BodySmall>
            </Link>
            <span>·</span>
            <Link href="/contact" className="hover:underline text-foreground">
                <BodySmall>
                    <TextPrimary>
                        {t('contact')}
                    </TextPrimary>
                </BodySmall>
            </Link>
            <span>·</span>
            <span className="flex">
                <BodySmall>
                    <TextPrimary>
                        © DiaspoPlug {new Date().getFullYear()}
                    </TextPrimary>
                </BodySmall>
            </span>
        </>
    );
}
