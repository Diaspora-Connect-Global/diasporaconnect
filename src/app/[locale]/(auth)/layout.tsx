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
        <div className="min-h-screen"> {/* Full viewport height */}
            <div className="lg:flex min-h-screen"> {/* Full height container */}
                {/* Left side*/}
                <div className="lg:w-[60%] h-full  flex-shrink-0"> {/* flex-shrink-0 */}
                    <div className="h-full mt-[30%] mx-[10%]">
                        <div className="mb-6">
                            <Image 
                                src="/DiaspoLogo.svg" 
                                alt="Logo" 
                                width={230} 
                                height={113} 
                                className="object-contain" 
                            />
                        </div>
                        <HeadingSmall>
                            {t("description")}
                        </HeadingSmall>
                    </div>
                </div>

                {/* Right side  */}
                <div className="lg:w-[40%] flex-1 flex flex-col bg-surface-default">
                    <div className="h-full flex flex-col"> 
                        <div className="flex-1 border-b  "> 
                            <div className="px-6 py-2">

                            {children} 
                            </div>
                        </div>

                        {/* Footer that sticks to bottom */}
                        <div className="lg:flex items-center justify-between m-auto py-4 px-4"> {/* ✅ FIXED: mt-auto */}
                            <div className="flex items-center space-x-2">
                                <LocaleSwitcher
                                    selectClassName="appearance-none text-text-primary"
                                    optionClassName="bg-surface-default"
                                />
                                <span className="text-gray-400">·</span>
                                <InfoLinks />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
