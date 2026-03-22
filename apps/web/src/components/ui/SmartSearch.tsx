import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { fuzzyMatch } from '@/utils/fuzzyMatch';

interface SmartSearchItem {
  id: string;
  label: string;
  description?: string;
  image?: string;
}

interface SmartSearchProps {
  items: SmartSearchItem[];
  onSelect: (item: { id: string; label: string }) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  storageKey?: string;
  popularItems?: SmartSearchItem[];
  className?: string;
}

const MAX_RECENT = 5;

function getRecentSearches(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(key: string, query: string) {
  try {
    const recent = getRecentSearches(key);
    const filtered = recent.filter((r) => r !== query);
    filtered.unshift(query);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {
    // silently fail
  }
}

function removeRecentSearch(key: string, query: string) {
  try {
    const recent = getRecentSearches(key);
    localStorage.setItem(
      key,
      JSON.stringify(recent.filter((r) => r !== query)),
    );
  } catch {
    // silently fail
  }
}

/** Renders text with fuzzy match ranges highlighted in bold. */
function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  if (ranges.length === 0) {
    return <span className="text-gray-600">{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const [start, end] of ranges) {
    if (start > lastEnd) {
      parts.push(
        <span key={`t-${lastEnd}`} className="text-gray-600">
          {text.slice(lastEnd, start)}
        </span>,
      );
    }
    parts.push(
      <span key={`m-${start}`} className="font-bold text-gray-900">
        {text.slice(start, end + 1)}
      </span>,
    );
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    parts.push(
      <span key={`t-${lastEnd}`} className="text-gray-600">
        {text.slice(lastEnd)}
      </span>,
    );
  }

  return <>{parts}</>;
}

export function SmartSearch({
  items,
  onSelect,
  onSearch,
  placeholder = 'Buscar...',
  storageKey = 'smart-search-recent',
  popularItems,
  className,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    getRecentSearches(storageKey),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (onSearch && query.length >= 2) {
        onSearch(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fuzzy match results
  const matchedResults = useMemo(() => {
    if (debouncedQuery.length < 2) return [];

    const results: Array<SmartSearchItem & { score: number; ranges: [number, number][] }> = [];

    for (const item of items) {
      const labelMatch = fuzzyMatch(debouncedQuery, item.label);
      const descMatch = item.description
        ? fuzzyMatch(debouncedQuery, item.description)
        : { match: false, score: 0, ranges: [] as [number, number][] };

      if (labelMatch.match || descMatch.match) {
        results.push({
          ...item,
          score: Math.max(labelMatch.score, descMatch.score),
          ranges: labelMatch.match ? labelMatch.ranges : [],
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }, [items, debouncedQuery]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [matchedResults]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-search-item]');
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (item: { id: string; label: string }) => {
      saveRecentSearch(storageKey, item.label);
      setRecentSearches(getRecentSearches(storageKey));
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
      onSelect(item);
    },
    [storageKey, onSelect],
  );

  const handleRecentClick = useCallback(
    (recent: string) => {
      setQuery(recent);
      setDebouncedQuery(recent);
      inputRef.current?.focus();
    },
    [],
  );

  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, recent: string) => {
      e.stopPropagation();
      removeRecentSearch(storageKey, recent);
      setRecentSearches(getRecentSearches(storageKey));
    },
    [storageKey],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  // Build a flat list of navigable items for keyboard nav
  const navigableItems = useMemo(() => {
    if (debouncedQuery.length >= 2) {
      return matchedResults.map((r) => ({
        type: 'result' as const,
        item: r,
      }));
    }
    const items: Array<
      | { type: 'recent'; value: string }
      | { type: 'popular'; item: SmartSearchItem }
    > = [];
    recentSearches.forEach((r) => items.push({ type: 'recent', value: r }));
    if (popularItems) {
      popularItems.forEach((p) => items.push({ type: 'popular', item: p }));
    }
    return items;
  }, [debouncedQuery, matchedResults, recentSearches, popularItems]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < navigableItems.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : navigableItems.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < navigableItems.length) {
            const nav = navigableItems[activeIndex];
            if (nav.type === 'result') {
              handleSelect({ id: nav.item.id, label: nav.item.label });
            } else if (nav.type === 'popular') {
              handleSelect({ id: nav.item.id, label: nav.item.label });
            } else if (nav.type === 'recent') {
              handleRecentClick(nav.value);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, navigableItems, activeIndex, handleSelect, handleRecentClick],
  );

  const showRecent =
    isOpen && debouncedQuery.length < 2 && recentSearches.length > 0;
  const showPopular =
    isOpen &&
    debouncedQuery.length < 2 &&
    popularItems &&
    popularItems.length > 0;
  const showResults = isOpen && debouncedQuery.length >= 2;
  const showDropdown = showRecent || showPopular || showResults;

  // Track the running navigable index for keyboard nav highlighting
  let navIdx = 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-2.5 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto z-50"
        >
          {/* Recent searches */}
          {showRecent && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Buscas recentes
              </div>
              {recentSearches.map((recent) => {
                const currentIdx = navIdx++;
                return (
                  <button
                    key={recent}
                    data-search-item
                    onClick={() => handleRecentClick(recent)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer',
                      activeIndex === currentIdx
                        ? 'bg-gray-50'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <span className="text-sm text-gray-500">{recent}</span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveRecent(e, recent)}
                      className="p-1 rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                );
              })}
            </div>
          )}

          {/* Popular items */}
          {showPopular && (
            <div>
              {showRecent && <div className="border-t border-gray-100" />}
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Populares
              </div>
              {popularItems!.map((item) => {
                const currentIdx = navIdx++;
                return (
                  <button
                    key={item.id}
                    data-search-item
                    onClick={() => handleSelect({ id: item.id, label: item.label })}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer',
                      activeIndex === currentIdx
                        ? 'bg-gray-50'
                        : 'hover:bg-gray-50',
                    )}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.label}
                        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-xs text-gray-400 truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {showResults && (
            <div>
              {matchedResults.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-400">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Tente buscar por outro termo
                  </p>
                </div>
              ) : (
                matchedResults.map((result) => {
                  const currentIdx = navIdx++;
                  return (
                    <button
                      key={result.id}
                      data-search-item
                      onClick={() =>
                        handleSelect({ id: result.id, label: result.label })
                      }
                      className={cn(
                        'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors cursor-pointer',
                        activeIndex === currentIdx
                          ? 'bg-gray-50'
                          : 'hover:bg-gray-50',
                      )}
                    >
                      {result.image && (
                        <img
                          src={result.image}
                          alt={result.label}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          <HighlightedText
                            text={result.label}
                            ranges={result.ranges}
                          />
                        </p>
                        {result.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
