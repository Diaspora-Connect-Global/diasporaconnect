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
        <div className="h-screen overflow-auto">
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left side - 60% on large screens, full width on mobile */}
                <div className="w-full lg:w-[60%] flex mt-[15%] p-4 lg:p-8 ">
                    <div className="mx-[10%]">
                        <Image src="/LOGO.png" alt="Logo" width={150} height={50} className="mb-8" />
                        
                        <HeadingSmall>
                            {t("description")}
                        </HeadingSmall>
                   
                    </div>
                </div>

                {/* Right side  */}
                <div className="lg:flex lg:w-[40%] h-fit
                ">
                    <div className="w-full bg-surface-default dark:bg-background flex flex-col min-h-screen">
                        <div className="flex-grow p-6 overflow-auto flex items-center justify-center">
                            <div className="w-full max-w-md">
                                {children}
                            </div>
                        </div>

                        {/* Footer that sticks to bottom */}
                        <div className="text-center text-xs space-x-2 py-4 border-t pb-10 flex justify-center flex-shrink-0">
                            <LocaleSwitcher
                                selectClassName="appearance-none text-text-primary -my-1.5 p-0  "
                                optionClassName="  bg-surface-default"
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