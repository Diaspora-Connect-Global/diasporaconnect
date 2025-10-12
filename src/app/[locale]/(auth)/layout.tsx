import LocaleSwitcher from "@/components/LocalSwitcher"
import { ThemeToggle } from "../theme-toggle"
import { useTranslations } from 'next-intl';
import Image from "next/image";


export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
      const t = useTranslations('home');
    
    return (
        <div className="min-h-screen">
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left side - 60% on large screens, full width on mobile */}
                <div className="w-full lg:w-[60%] flex  mt-[15%] p-4 lg:p-8">
                    <div className="mx-[10%]">
                        <Image src="/logo.png" alt="Logo" width={150} height={50} className="mb-8"/>
                        <p className="text-foreground text-2xl">
                            {t("info")}
                        </p>
                    </div>
                </div>

                {/* Right side  */}
                <div className="lg:flex lg:w-[40%] ">
                    <div className="w-full bg-white dark:bg-background flex flex-col min-h-screen lg:min-h-0">
                        <div className="flex-grow p-6">
                            {children}
                        </div>
                        
                        {/* Footer that sticks to bottom */}
                        <div className="text-center text-xs space-x-2 py-4 border-t pb-10">
                            <ThemeToggle/> <LocaleSwitcher/>
                            <span>·</span>
                            <a href="#" className="hover:underline text-foreground">About</a>
                            <span>·</span>
                            <a href="#" className="hover:underline text-foreground">Terms</a>
                            <span>·</span>
                            <a href="#" className="hover:underline text-foreground">Privacy Policy</a>
                            <span>·</span>
                            <a href="#" className="hover:underline text-foreground">Contact us</a>
                            <span>·</span>
                            <span>© DCG 2025</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}