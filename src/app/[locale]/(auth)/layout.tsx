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
        <div className="lg:flex h-[100dvh]">
            {/* Left side - Hidden on mobile, shown on desktop */}
            <div className="lg:w-[60%]">
                <div className="h-full   lg:pt-[10%] md:mx-[10%] flex lg:flex-col justify-center lg:justify-normal ">
                    <div className=" mx-auto lg:mx-0">
                        <Image
                            src="/DiaspoLogo.svg"
                            alt="Logo"
                            width={230}
                            height={93}
                            className="object-contain"
                        />
                    </div>
                    <div className='hidden lg:flex'>
                    <HeadingSmall>
                        {t("description")}
                    </HeadingSmall>

                    </div>
                </div>
            </div>

            {/* Right side - Full width on mobile */}
            <div className="w-full lg:w-[40%] lg:h-full lg:overflow-y-auto scrollbar-hide flex flex-col bg-surface-default px-4 lg:py-4">

                {children}
                {/* Footer that sticks to bottom */}
                    <div className="flex items-center  space-x-2 flex-wrap">
                        <InfoLinks />
                    </div>
            </div>
        </div>
    )
}
