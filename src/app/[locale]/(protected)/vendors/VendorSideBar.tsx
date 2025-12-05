"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function VendorSidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    
    // Extract the language and active tab from the URL
    const getActiveTab = () => {
        const segments = pathname.split('/').filter(Boolean);
        // segments example: ['en', 'vendors', 'orders']
        const lastSegment = segments[segments.length - 1];
        
        // If the last segment is 'vendors', it means we're on the overview page
        if (lastSegment === 'vendors' || segments.length === 2) {
            return 'overview';
        }
        
        return lastSegment || 'overview';
    };

    const getLanguage = () => {
        const segments = pathname.split('/').filter(Boolean);
        // First segment is the language code
        return segments[0] || 'en';
    };

    const activeTab = getActiveTab();
    const currentLang = getLanguage();

    const menuItems = [
        {
            id: 'overview',
            label: 'Overview',
            href: `/${currentLang}/vendors`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            )
        },
        {
            id: 'orders',
            label: 'Orders',
            href: `/${currentLang}/vendors/orders`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            )
        },
        {
            id: 'services',
            label: 'Services',
            href: `/${currentLang}/vendors/services`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            )
        },
        {
            id: 'products',
            label: 'Products',
            href: `/${currentLang}/vendors/products`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            )
        },
        {
            id: 'sales',
            label: 'Sales',
            href: `/${currentLang}/vendors/sales`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            )
        },
        {
            id: 'payouts',
            label: 'Payouts',
            href: `/${currentLang}/vendors/payouts`,
            icon: (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            )
        }
    ];

    const handleNavigation = (href: string) => {
        router.push(href);
    };

    return (
        <div className="overflow-hidden ">
            <div className="h-[10vh]  flex justify-between text-center items-center bg-surface-default px-6">
                <div className="text-primary flex items-center gap-2">
                    <p className="heading-small text-brand">d</p>
                    <h1 className="heading-xsmall">Vendor dashboard</h1>
                </div>
                <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>
                        <Image
                            width={25}
                            height={25}
                            src="/PROFILE.png"
                            alt="Profile" />
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="flex h-[90vh]    ">
                <aside className="w-[22vw] overflow-y-auto px-6 bg-surface-default   flex flex-col">
                    {/* Header */}
                    <div className="mt-5">
                        <button 
                            onClick={() => router.push(`/${currentLang}/vendors/services/new`)}
                            className="w-full px-4 py-2.5 rounded-lg transition-colors flex gap-2 text-text-brand"
                        >
                            <span className="">+</span>
                            Add new service
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1  space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNavigation(item.href)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg label-large cursor-pointer transition-colors ${
                                    activeTab === item.id
                                        ? 'bg-surface-brand-light text-text-brand'
                                        : 'text-text-secondary hover:bg-gray-100'
                                }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {item.icon}
                                </svg>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="h-full overflow-y-auto  p-6 scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>
    );
}