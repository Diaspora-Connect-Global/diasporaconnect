"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { ButtonType2, ButtonType3 } from "@/components/custom/button";

const Pagination = ({
    LIST,
    newList,
    setNewList,
    perPage,
    setPerPage
}: {
    LIST: { length: number; slice: (start: number, end: number) => any[] };
    newList: any[];
    setNewList: (list: any[]) => void;
    perPage: number;
    setPerPage: (perPage: number) => void;
}) => {
    const [activeTab, setActiveTab] = useState<number>(1);

    useEffect(() => {
        setActiveTab(1);
    }, [perPage]);

    useEffect(() => {
        const start = (activeTab - 1) * perPage;
        const end = start + perPage;
        setNewList(LIST?.slice(start, end) ?? []);
    }, [LIST, activeTab, perPage, setNewList]);

    const numOfTabs = Math.ceil(LIST?.length / perPage);

    const shouldShowButton = (index: number): boolean => {
        if (numOfTabs === 1) return index === 1;
        if (numOfTabs === 2) return index === 1 || index === 2;
        if (numOfTabs === 3) return index === 1 || index === 2 || index === 3;
        return index === activeTab || (index >= activeTab - 1 && index <= activeTab + 1);
    };

    const handlePrevious = (): void => {
        if (activeTab > 1) setActiveTab(activeTab - 1);
    };

    const handleNext = (): void => {
        if (activeTab < numOfTabs) setActiveTab(activeTab + 1);
    };

    return (
        <>
            <div className="d-flex">
                {newList?.map((item: any, index: number) => (
                    <p key={index}>{item?.name}</p>
                ))}
            </div>

            <div className="d-md-flex mb-3">
                <p className="text-center text-md-start" style={{
                    color: "#4D44B5",
                    padding: '8px 16px',
                }}>Showing {(activeTab - 1) * perPage + 1} - {Math.min(activeTab * perPage, LIST?.length)} of {LIST?.length}</p>

                <div className="d-flex d-md-block justify-content-sm-center">
                    {activeTab > 1 && (
                        <ButtonType3 onClick={handlePrevious} className="mr-1 bg-[#f0f0f0] text-[#4D44B5] hover:bg-[#e0e0e0]">
                            &lt;
                        </ButtonType3>
                    )}
                    {Array.from({ length: numOfTabs }, (_, i) => i + 1)
                        .filter(shouldShowButton)
                        .map((pageNumber: number) =>
                            pageNumber === activeTab ? (
                                <ButtonType2 key={pageNumber} onClick={() => setActiveTab(pageNumber)} className="mx-1">
                                    {pageNumber}
                                </ButtonType2>
                            ) : (
                                <ButtonType3 key={pageNumber} onClick={() => setActiveTab(pageNumber)} className="mx-1 bg-[#f0f0f0] text-black hover:bg-[#e0e0e0]">
                                    {pageNumber}
                                </ButtonType3>
                            )
                        )}
                    {activeTab < numOfTabs && (
                        <ButtonType3 onClick={handleNext} className="ml-1 bg-[#f0f0f0] text-[#4D44B5] hover:bg-[#e0e0e0]">
                            &gt;
                        </ButtonType3>
                    )}
                </div>
            </div>
        </>
    );
};

export default Pagination;
