"use client"
import React from 'react';
import { ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
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
                    {required && <span className="text-text-danger ml-1">*</span>}
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
                    {required && <span className="text-text-danger ml-1">*</span>}
                </LabelMedium>
            </label>
            <div className="bg-surface-subtle rounded-md">
                <div className="border-border-subtle border-2 rounded-md">
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
    bg?: string;
}

// export const SearchInput: React.FC<SearchInputProps> = ({
//     value,
//     onChange,
//     onSearch,
//     placeholder = "Search...",
//     id = "search",
//     bg = "bg-surface-subtle"
// }) => {
//     const handleKeyPress = (e: React.KeyboardEvent) => {
//         if (e.key === 'Enter') {
//             onSearch();
//         }
//     };

//     return (
//         <div className="">
//             <div className={`${bg} rounded-full`}>
//                 <div className="relative ${bg} border-border-subtle border-2 rounded-full flex text-text-secondary">
//                     <input
//                         id={id}
//                         type="text"
//                         placeholder={placeholder}
//                         value={value}
//                         onChange={(e) => onChange(e.target.value)}
//                         onKeyDown={handleKeyPress}
//                         className="w-48 pl-10 pr-4 py-2 border text-text-primary rounded-lg outline-none  border-transparent"
//                     />
//                     <button
//                         type="button"
//                         onClick={onSearch}
//                         className=" absolute z-50 left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 "
//                     >
//                         <Search size={20} />
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };




export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  id = "search",
  bg = "bg-surface-subtle",
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  return (
    <div className="space-y-2">
      <div className={`${bg} rounded-full`}>
        <div className={`relative ${bg} border-border-subtle border-2 rounded-full flex items-center`}>
          <input
            id={id}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 pl-10 pr-4 py-2 border text-text-primary rounded-full outline-none border-transparent"
          />
          <button
            type="button"
            onClick={onSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          >
            <Search size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};


interface SelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    label?: string;
    id?: string;
    required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Select an option",
    label,
    id = "select",
    required = false
}) => {
    return (
        <div className="space-y-2">
            {label && (
                <label htmlFor={id} className="text-sm font-normal">
                    <LabelMedium>
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </LabelMedium>
                </label>
            )}
            <div className="bg-surface-subtle rounded-md">
                <div className="border-border-subtle border-2 rounded-md relative">
                    <select
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="h-12 w-full bg-transparent px-3 pr-10 appearance-none focus:outline-none text-text-primary cursor-pointer"
                        required={required}
                    >
                        <option value="" disabled className="text-text-secondary">
                            {placeholder}
                        </option>
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown
                        size={20}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                    />
                </div>
            </div>
        </div>
    );
};

interface MonthSelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    id?: string;
    required?: boolean;
}

export const MonthSelect: React.FC<MonthSelectProps> = ({
    value,
    onChange,
    label = "Month",
    id = "month",
    required = false
}) => {
    const months = [
        { value: "01", label: "January" },
        { value: "02", label: "February" },
        { value: "03", label: "March" },
        { value: "04", label: "April" },
        { value: "05", label: "May" },
        { value: "06", label: "June" },
        { value: "07", label: "July" },
        { value: "08", label: "August" },
        { value: "09", label: "September" },
        { value: "10", label: "October" },
        { value: "11", label: "November" },
        { value: "12", label: "December" }
    ];

    return (
        <Select
            value={value}
            onChange={onChange}
            options={months}
            placeholder="Select month"
            label={label}
            id={id}
            required={required}
        />
    );
};

interface CountrySelectProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    id?: string;
    required?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
    value,
    onChange,
    label = "Country",
    id = "country",
    required = false
}) => {
    const countries = [
        { value: "US", label: "United States" },
        { value: "GB", label: "United Kingdom" },
        { value: "CA", label: "Canada" },
        { value: "AU", label: "Australia" },
        { value: "DE", label: "Germany" },
        { value: "FR", label: "France" },
        { value: "ES", label: "Spain" },
        { value: "IT", label: "Italy" },
        { value: "NL", label: "Netherlands" },
        { value: "BE", label: "Belgium" },
        { value: "CH", label: "Switzerland" },
        { value: "AT", label: "Austria" },
        { value: "SE", label: "Sweden" },
        { value: "NO", label: "Norway" },
        { value: "DK", label: "Denmark" },
        { value: "FI", label: "Finland" },
        { value: "PL", label: "Poland" },
        { value: "CZ", label: "Czech Republic" },
        { value: "GR", label: "Greece" },
        { value: "PT", label: "Portugal" },
        { value: "IE", label: "Ireland" },
        { value: "NZ", label: "New Zealand" },
        { value: "SG", label: "Singapore" },
        { value: "HK", label: "Hong Kong" },
        { value: "JP", label: "Japan" },
        { value: "KR", label: "South Korea" },
        { value: "CN", label: "China" },
        { value: "IN", label: "India" },
        { value: "BR", label: "Brazil" },
        { value: "MX", label: "Mexico" },
        { value: "AR", label: "Argentina" },
        { value: "ZA", label: "South Africa" },
        { value: "NG", label: "Nigeria" },
        { value: "KE", label: "Kenya" },
        { value: "EG", label: "Egypt" },
        { value: "GH", label: "Ghana" },
        { value: "AE", label: "United Arab Emirates" },
        { value: "SA", label: "Saudi Arabia" },
        { value: "IL", label: "Israel" },
        { value: "TR", label: "Turkey" },
        { value: "RU", label: "Russia" },
        { value: "UA", label: "Ukraine" }
    ].sort((a, b) => a.label.localeCompare(b.label));

    return (
        <Select
            value={value}
            onChange={onChange}
            options={countries}
            placeholder="Select country"
            label={label}
            id={id}
            required={required}
        />
    );
};


/* ========== NEW: TextArea Component ========== */
interface TextAreaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    id?: string;
    required?: boolean;
    rows?: number;
    maxLength?: number;
}

export const TextArea: React.FC<TextAreaProps> = ({
    value,
    onChange,
    placeholder = "Enter your message...",
    label,
    id = "textarea",
    required = false,
    rows = 4,
    maxLength
}) => {
    return (
        <div className="space-y-2">
            {label && (
                <label htmlFor={id} className="text-sm font-normal">
                    <LabelMedium>
                        {label}
                        {required && <span className="text-text-danger ml-1">*</span>}
                    </LabelMedium>
                </label>
            )}
            <div className="bg-surface-subtle rounded-md">
                <div className="border-border-subtle border-2 rounded-md">
                    <textarea
                        id={id}
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        rows={rows}
                        maxLength={maxLength}
                        className="w-full px-3 py-2 bg-transparent placeholder:text-text-secondary resize-none focus:outline-none"
                        required={required}
                    />
                    {maxLength && (
                        <div className="px-3 pb-1 text-xs text-text-secondary text-right">
                            {value.length} / {maxLength}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};