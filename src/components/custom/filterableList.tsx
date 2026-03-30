/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from "react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";



// interface FilterableItem {
//     id: string;
//     [key: string]: any; 
// }

interface TabConfig {
    name: string;
    filter: string;
    emptystateMessage: string;
}

interface ListItemConfig {
    id: string;
    title: string;
    customComponent: React.ComponentType<{ item: any }>;
    tabs: TabConfig[];
}

interface FilterableListProps {
    items: any[];
    filteredItems: any[];
    setFilteredItems: (items: any[]) => void;
    listConfig: ListItemConfig;
    title: string;
    showHeaderActions?: boolean;
}

export function FilterableList({
    items,
    filteredItems,
    setFilteredItems,
    listConfig,
}: FilterableListProps) {
    // Set 'all' as the default filter
    const [filter, setFilter] = useState<string>('all');
    const CustomComponent = listConfig.customComponent;
    const router = useRouter();

    // Convert the config tabs to the format needed for the component
    const tabs = listConfig.tabs.map(tab => ({
        label: tab.name,
        value: tab.filter
    }));

    // Create empty state messages object
    const emptyStateMessages = listConfig.tabs.reduce((acc, tab) => {
        acc[tab.filter] = tab.emptystateMessage;
        return acc;
    }, {} as Record<string, string>);

    // Use useEffect to handle filtering based on the current filter and items state
    useEffect(() => {
        if (filter === 'all') {
            setFilteredItems(items);
        } else {
            const filtered = items.filter(item => item.type === filter);
            setFilteredItems(filtered);
        }
    }, [filter, items, setFilteredItems]);

    const handleFilterChange = (value: string) => {
        setFilter(value);
    };

    // Get empty state message based on current filter
    const getEmptyStateMessage = () => {
        if (filteredItems.length === 0) {
            return emptyStateMessages[filter] || "No items found.";
        }
        return null;
    };

    const emptyStateMessage = getEmptyStateMessage();

    return (
        <div className="lg:w-[60vw] h-[calc(100vh-4rem)] p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => router.back()} 
                            className="p-1.5 hover:bg-surface-tertiary rounded-full transition-colors text-text-secondary hover:text-text-primary"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <p className="heading-small">
                            {listConfig.title}
                        </p>
                    </div>
                </div>

            <div>
                <div className="flex flex-wrap gap-2 w-full mb-4">
                    {tabs.map((tab) =>
                            tab.value === filter ? (
                                <ButtonType2 key={tab.value} onClick={() => handleFilterChange(tab.value)} className="transition-all duration-300">
                                    {tab.label}
                                </ButtonType2>
                            ) : (
                                <ButtonType3 key={tab.value} onClick={() => handleFilterChange(tab.value)} className="bg-surface-default text-text-secondary hover:bg-surface-tertiary transition-all duration-300">
                                    {tab.label}
                                </ButtonType3>
                            )
                        )}
                </div>
            </div>

            {emptyStateMessage ? (
                <div className="text-text-secondary font-medium">
                    {emptyStateMessage}
                </div>
            ) : (
                <div className=" rounded-md mb-6 overflow-y-auto scrollbar-hide lg:max-h-[calc(100vh-12rem)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-6">

                    {filteredItems.map((item) => (
                        <CustomComponent
                            key={item.id}
                            item={item}
                        />
                    ))}
                    </div>
                </div>
            )}
        </div>
    );
}