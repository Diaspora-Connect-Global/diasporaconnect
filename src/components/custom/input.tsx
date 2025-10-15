import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LabelMedium } from '../utils';

interface PasswordInputProps {
    password: string;
    setPassword: (value: string) => void;
    showPassword: boolean;
    setShowPassword: (value: boolean) => void;
    placeholder?: string;
    label?: string;
    id: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
    password,
    setPassword,
    showPassword,
    setShowPassword,
    placeholder = "Your new password",
    label = "Create password",
    id = "password"

}) => {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-normal">
                <LabelMedium>
                    {label}
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
}

export const TextInput: React.FC<TextInputProps> = ({
    value,
    onChange,
    type = "text",
    placeholder = "Your email",
    label = "Email",
    id = "email"
}) => {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="">
                <LabelMedium>
                    {label}
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
                    />
                </div>
            </div>
        </div>
    );
};