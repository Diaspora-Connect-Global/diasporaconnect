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
                <div className="lg:w-[calc(912/1512*100vw)]  lg:h-[calc(922/922*100vh)] ">
                    <div className="lg:w-[calc(712/1512*100vw)] lg:h-[calc(195/922*100vh)] lg:mx-auto lg:mt-[21.69%] ">
                    <div className="lg:w-[calc(196/1512*100vw)] lg:h-[calc(93/922*100vh)]">
                        <Image src="/LOGO.png" alt="Logo" width={196} height={93} className=" object-contain" />

                    </div>
                        <HeadingSmall>
                            {t("description")}
                        </HeadingSmall>

                    </div>
                </div>

                {/* Right side  */}
                <div className="lg:w-[calc(600/1512*100vw)] lg:h-[calc(922/922*100vh)]  bg-surface-default
                ">
                    <div className="lg:h-[calc(868/922*100vh)]" >
                        <div className="lg:border-b-border-default lg:border-b lg:h-[calc(824/922*100vh)] lg:mb-[calc(24/922*100vh)] lg:px-[calc(40/1512*100vw)]  lg:pt-[calc(40/922*100vh)] ">
                            {children}
                        </div>

                        {/* Footer that sticks to bottom */}
                        <div className="lg:h-[calc(20/922*100vh)]  lg:flex justify-center items-center text-center">
                            <LocaleSwitcher
                                selectClassName="appearance-none text-text-primary"
                                optionClassName=" bg-surface-default"
                            />
                            <span>.</span>
                            <InfoLinks />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}