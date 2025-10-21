import LocaleSwitcher from "@/components/LocalSwitcher"
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { HeadingSmall } from "@/components/utils";
import InfoLinks from "@/components/custom/infoLinks";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const t = useTranslations('authentication');

    return (
        <div className="">
            <div className="lg:flex">
                {/* Left side*/}
                <div className="lg:w-[calc(912/1512*100vw)] lg:h-screen"> {/* 912px equivalent, full viewport height */}
                    <div className="lg:w-[44.5rem] lg:h-[13.125rem] lg:mx-auto lg:mt-[21.69%]"> {/* 712px, 210px equivalent */}
                        <div className="lg:max-w-[12.25rem] lg:h-[5.8125rem]"> {/* 196px, 93px equivalent */}
                            <Image 
                                src="/LOGO.png" 
                                alt="Logo" 
                                width={196} 
                                height={93} 
                                className="w-full h-full object-contain" 
                            />
                        </div>
                        <HeadingSmall>
                            {t("description")}
                        </HeadingSmall>
                    </div>
                </div>

                {/* Right side  */}
                <div className="lg:w-[calc(600/1512*100vw)]  bg-surface-default"> {/* 600px equivalent */}
                    <div className=""> {/* 868px equivalent */}
                        <div className="lg:border-b-border-default lg:border-b lg:h-[51.5rem] lg:mb-[1.5rem] lg:px-[2.5rem] lg:pt-[2.5rem]"> {/* 824px, 24px, 40px equivalent */}
                            {children}
                        </div>

                        {/* Footer that sticks to bottom */}
                        <div className="lg:h-[1.25rem] lg:flex justify-center items-center text-center gap-[0.5rem]"> {/* 20px, 8px equivalent */}
                            <LocaleSwitcher
                                selectClassName="appearance-none text-text-primary"
                                optionClassName="bg-surface-default"
                            />
                            <span>·</span>
                            <InfoLinks />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}