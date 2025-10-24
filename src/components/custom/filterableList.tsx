/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from "react";



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
        <div className="lg:max-w-[63rem] mx-2 lg:mx-[2%] h-[calc(100vh-4rem)] py-4">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-2xl font-heading-large">
                        {listConfig.title}
                    </p>
                </div>

            <div>
                <div className="flex flex-wrap gap-2 w-full mb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => handleFilterChange(tab.value)}
                            className={`cursor-pointer px-4 py-2 rounded-full transition-all duration-300 ${
                                tab.value === filter
                                    ? 'bg-surface-brand text-white'
                                    : 'bg-surface-default text-text-secondary hover:bg-surface-tertiary'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {emptyStateMessage ? (
                <div className="text-text-secondary font-medium">
                    {emptyStateMessage}
                </div>
            ) : (
                <div className=" rounded-md p-6 overflow-y-auto scrollbar-hide lg:max-h-[calc(100vh-12rem)]">
                    <div className="grid grid-cols-2 gap-2">

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