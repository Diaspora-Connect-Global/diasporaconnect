"use client"
import React from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { LabelMedium } from '../utils';

interface PasswordInputProps {
    password: string;
    setPassword: (value: string) => void;
    showPassword: boolean;
    setShowPassword: (value: boolean) => void;
    placeholder?: string;
    label?: string;
    id: string;
    required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
    password,
    setPassword,
    showPassword,
    setShowPassword,
    placeholder = "Your new password",
    label = "Create password",
    id = "password",
    required = false

}) => {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-normal">
                <LabelMedium>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </LabelMedium>
            </label>
            <div className="relative">
                <div className="bg-surface-subtle rounded-md">
                    <div className="border-border-subtle border-2  rounded-md">
                        <input
                            id={id}
                            type={showPassword ? 'text' : 'password'}
                            placeholder={placeholder}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 pr-10  placeholder:text-text-secondary w-full bg-transparent px-3 focus:outline-none"
                            required={required}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    label?: string;
    id?: string;
    required?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
    value,
    onChange,
    type = "text",
    placeholder = "Your email",
    label = "Email",
    id = "email",
    required = false
}) => {
    return (
        <div className="space-y-2 ">
            <label htmlFor={id} className="">
                <LabelMedium>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </LabelMedium>
            </label>
            <div className="bg-surface-subtle rounded-md">
                <div className="border-border-subtle border-2  rounded-md">
                    <input
                        id={id}
                        type={type}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-12  placeholder:text-text-secondary w-full  px-3 focus:outline-none"
                        required={required}
                    />
                </div>
            </div>
        </div>
    );
};

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    placeholder?: string;
    label?: string;
    id?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    onSearch,
    placeholder = "Search...",
    id = "search"
}) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    return (
        <div className="space-y-2">
         
            <div className=" rounded-md">
                <div className="relative bg-surface-subtle border-border-subtle border-2 rounded-full flex text-text-secondary">
                    <input
                        id={id}
                        type="text"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="w-48 pl-10 pr-4 py-2 border text-text-primary rounded-lg outline-none  border-transparent"
                    />
                    <button
                        type="button"
                        onClick={onSearch}
                        className=" absolute z-50 left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 "
                    >
                        <Search size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};