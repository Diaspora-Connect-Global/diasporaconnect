/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';

interface Option {
  id: string;
  label: string;
}

interface AutocompleteAsyncProps {
  value: string[];
  onChange: (value: string[]) => void;
  fetchOptions: (query: string) => Promise<Option[]>;
  onCreate?: (label: string) => Promise<Option>;
  placeholder?: string;
  label?: string;
  debounceDelay?: number;
  className?: string;
}

export function AutocompleteAsync({
  value = [],
  onChange,
  fetchOptions,
  onCreate,
  placeholder = 'Search or add new...',
  label,
  debounceDelay = 300,
  className,
}: AutocompleteAsyncProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Cache selected labels so they persist even when options are cleared
  const [selectedOptionsCache, setSelectedOptionsCache] = useState<Map<string, string>>(new Map());

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Debounced search                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await fetchOptions(inputValue);
        setOptions(results);
        setIsOpen(true);
      } catch (e) {
        console.error(e);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceDelay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchOptions, debounceDelay]);

  /* ------------------------------------------------------------------ */
  /*  Cache labels when options are loaded                              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const newCache = new Map(selectedOptionsCache);
    options.forEach((opt) => newCache.set(opt.id, opt.label));
    setSelectedOptionsCache(newCache);
  }, [options]);

  /* ------------------------------------------------------------------ */
  /*  Keyboard navigation                                               */
  /* ------------------------------------------------------------------ */
  const totalItems = options.length + (inputValue && onCreate && options.length === 0 ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i < totalItems - 1 ? i + 1 : i));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < options.length) {
            selectOption(options[highlightedIndex]);
          } else if (onCreate && inputValue) {
            createAndSelect(inputValue);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Backspace':
        if (!inputValue && value.length) {
          removeOption(value[value.length - 1]);
        }
        break;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Selection helpers                                                 */
  /* ------------------------------------------------------------------ */
  const selectOption = (opt: Option) => {
    if (!value.includes(opt.id)) onChange([...value, opt.id]);
    resetInput();
  };

  const createAndSelect = async (label: string) => {
    if (!onCreate) return;
    try {
      const newOpt = await onCreate(label);
      onChange([...value, newOpt.id]);
      setSelectedOptionsCache((prev) => new Map(prev).set(newOpt.id, newOpt.label));
    } finally {
      resetInput();
    }
  };

  const resetInput = () => {
    setInputValue('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const removeOption = (id: string) => {
    onChange(value.filter((v) => v !== id));
    inputRef.current?.focus();
  };

  const clearAll = () => {
    onChange([]);
    inputRef.current?.focus();
  };

  /* ------------------------------------------------------------------ */
  /*  Resolve pill labels using cache                                   */
  /* ------------------------------------------------------------------ */
  const selectedLabels = value
    .map((id) => selectedOptionsCache.get(id) ?? id)
    .filter(Boolean);

  const showCreate = onCreate && inputValue.trim() && options.length === 0;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {/* Blue container – pills + input */}
          <div
            className={cn(
              'min-h-12 px-3 py-2 bg-surface-subtle border-2 rounded-md',
              'flex flex-wrap items-center gap-2 cursor-text transition-all',
              ' border-border-subtle',
              
            )}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Pills */}
            {selectedLabels.map((lbl, i) => (
              <span
                key={value[i]}
                className="inline-flex items-center gap-1 px-3 py-1 border border-border-subtle  text-text-brand rounded-full text-sm font-medium"
              >
                {lbl}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(value[i]);
                  }}
                  className="ml-1  rounded-full cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {/* Input */}
            <div className="flex-1 min-w-32 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => inputValue && setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : ''}
                className="w-full h-8 bg-transparent outline-none text-text-primary placeholder:text-text-secondary"
              />
              {isLoading && (
                <Loader2
                  size={16}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-surface-brand animate-spin"
                />
              )}
            </div>

            {/* Clear all */}
            {value.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-xs text-surface-brand hover:text-surface-brand/70 underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </PopoverTrigger>

        {/* Dropdown – always visible via portal */}
        <PopoverContent
          className="p-0 w-full"
          sideOffset={4}
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {isLoading ? (
            <div className="p-3 text-center text-sm text-text-secondary">
              <Loader2 size={16} className="inline mr-2 animate-spin" />
              Searching...
            </div>
          ) : options.length === 0 && !showCreate ? (
            <div className="p-3 text-center text-sm text-text-secondary">
              No results found ,type to search
            </div>
          ) : (
            <ul>
              {options.map((opt, idx) => {
                const selected = value.includes(opt.id);
                const highlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt.id}
                    onClick={() => selectOption(opt)}
                    className={cn(
                      'px-3 py-2 cursor-pointer flex items-center justify-between text-sm',
                      highlighted && 'bg-surface-subtle',
                      selected && 'text-surface-brand font-medium'
                    )}
                  >
                    <span>{opt.label}</span>
                    {selected && <div className="w-2 h-2 bg-surface-brand rounded-full" />}
                  </li>
                );
              })}

              {showCreate && (
                <li
                  onClick={() => createAndSelect(inputValue)}
                  className={cn(
                    'px-3 py-2 cursor-pointer text-sm border-t border-border-subtle bg-surface-subtle',
                    highlightedIndex === options.length && 'bg-surface-hover'
                  )}
                >
                  <span className="text-surface-brand font-medium">
                    + Create {inputValue}
                  </span>
                </li>
              )}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}