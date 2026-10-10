import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Plus, Filter, Info, Sparkles } from 'lucide-react';
import { MUTATION_CATALOG, DRUG_CLASSES } from '../data/mutationCatalog';

/**
 * Searchable Multi-Select Mutation Dropdown Component.
 * Supports drug class filtering, real-time search, custom mutation entry,
 * click-outside closing, and selected chips with removal.
 */
export default function MutationSelectDropdown({ selectedMutations, onSelectionChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter mutations based on search query and drug class
  const filteredMutations = MUTATION_CATALOG.filter((item) => {
    const matchesClass = selectedClass === 'All' || item.class === selectedClass;
    const query = searchQuery.trim().toUpperCase();
    const matchesQuery =
      !query ||
      item.name.toUpperCase().includes(query) ||
      item.class.toUpperCase().includes(query) ||
      item.impact.toUpperCase().includes(query);
    return matchesClass && matchesQuery;
  });

  // Check if typed query is a valid custom mutation not already in list
  const cleanSearchQuery = searchQuery.trim().toUpperCase();
  const isExactMatch = MUTATION_CATALOG.some(
    (m) => m.name.toUpperCase() === cleanSearchQuery
  );
  const canAddCustom =
    cleanSearchQuery.length >= 2 &&
    !isExactMatch &&
    !selectedMutations.includes(cleanSearchQuery);

  const handleToggleMutation = (mutId) => {
    if (selectedMutations.includes(mutId)) {
      onSelectionChange(selectedMutations.filter((m) => m !== mutId));
    } else {
      onSelectionChange([...selectedMutations, mutId]);
    }
  };

  const handleAddCustomMutation = () => {
    if (!canAddCustom) return;
    onSelectionChange([...selectedMutations, cleanSearchQuery]);
    setSearchQuery('');
  };

  const handleRemoveMutation = (mutId, e) => {
    e.stopPropagation();
    onSelectionChange(selectedMutations.filter((m) => m !== mutId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMutations.map((m) => m.id);
    const newSelection = Array.from(new Set([...selectedMutations, ...filteredIds]));
    onSelectionChange(newSelection);
  };

  // Class badge color helper
  const getClassBadgeStyle = (cls) => {
    switch (cls) {
      case 'NRTI':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NNRTI':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'INSTI':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Capsid':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {/* DROPDOWN SELECTOR BOX */}
      <div>
        <label className="block text-xs font-bold text-[#17233B] uppercase tracking-wider mb-2">
          Select HIV Resistance Mutations (Search & Multi-Select)
        </label>

        <div className="relative">
          {/* Main Clickable Trigger Header */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full min-h-[46px] px-3.5 py-2.5 bg-[#F8FAFC] border rounded-xl cursor-pointer flex items-center justify-between transition shadow-xs ${
              isOpen
                ? 'border-[#55175E] ring-2 ring-[#55175E]/20 bg-white'
                : 'border-[#E5EAF0] hover:border-slate-300 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center space-x-2 flex-wrap gap-y-1 overflow-hidden pr-2">
              <Search className="h-4 w-4 text-[#94A3B8] shrink-0" />
              {selectedMutations.length === 0 ? (
                <span className="text-sm text-[#94A3B8] select-none">
                  Click to select from verified HIV resistance mutations catalog...
                </span>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[#17233B]">
                    {selectedMutations.length} mutation{selectedMutations.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedMutations.slice(0, 3).map((mut) => (
                      <span
                        key={mut}
                        className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#EDE3FA] text-[#55175E] font-bold text-xs border border-[#D8C6EE]"
                      >
                        {mut}
                      </span>
                    ))}
                    {selectedMutations.length > 3 && (
                      <span className="text-xs font-bold text-[#64748B] bg-slate-200 px-1.5 py-0.5 rounded">
                        +{selectedMutations.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {selectedMutations.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="text-xs text-[#94A3B8] hover:text-rose-600 font-semibold px-1.5 py-0.5 rounded hover:bg-slate-200 transition"
                  title="Clear all selected mutations"
                >
                  Clear
                </button>
              )}
              <ChevronDown
                className={`h-4 w-4 text-[#64748B] transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[#55175E]' : ''
                }`}
              />
            </div>
          </div>

          {/* FLOATING DROPDOWN MENU */}
          {isOpen && (
            <div className="absolute z-50 mt-2 w-full bg-white border border-[#E5EAF0] rounded-xl shadow-xl overflow-hidden animate-fadeIn">
              {/* Top Search Bar */}
              <div className="p-3 border-b border-[#E5EAF0] bg-[#FAF7FD] space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by mutation code (e.g. M184V, K103N, DRV)..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-[#E5EAF0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#55175E] text-[#17233B] placeholder-[#94A3B8]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canAddCustom) {
                        handleAddCustomMutation();
                      }
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#64748B]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Drug Class Filter Tabs */}
                <div className="flex items-center justify-between gap-1 overflow-x-auto pt-0.5">
                  <div className="flex items-center space-x-1">
                    {DRUG_CLASSES.map((cls) => {
                      const isActive = selectedClass === cls;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setSelectedClass(cls)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap ${
                            isActive
                              ? 'bg-[#55175E] text-white shadow-xs'
                              : 'bg-white border border-[#E5EAF0] text-[#64748B] hover:bg-slate-100'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[#55175E] hover:underline font-bold"
                    >
                      Select all
                    </button>
                  </div>
                </div>
              </div>

              {/* Mutation Options Scroll List */}
              <div className="max-h-64 overflow-y-auto divide-y divide-[#F1F5F9] p-1">
                {canAddCustom && (
                  <div
                    onClick={handleAddCustomMutation}
                    className="p-2.5 hover:bg-[#FAF7FD] rounded-lg cursor-pointer flex items-center justify-between text-[#55175E] transition m-1 border border-dashed border-[#D8C6EE]"
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 text-[#55175E]" />
                      <span className="text-xs font-bold">
                        Add custom mutation token: <span className="underline">{cleanSearchQuery}</span>
                      </span>
                    </div>
                    <span className="text-[10px] bg-[#EDE3FA] text-[#55175E] px-2 py-0.5 rounded font-bold">
                      Custom Entry
                    </span>
                  </div>
                )}

                {filteredMutations.length === 0 && !canAddCustom ? (
                  <div className="p-6 text-center text-[#64748B] text-xs">
                    No mutations match "{searchQuery}". Type a valid mutation code (e.g. M184V) to add it.
                  </div>
                ) : (
                  filteredMutations.map((item) => {
                    const isSelected = selectedMutations.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleMutation(item.id)}
                        className={`p-2.5 rounded-lg cursor-pointer flex items-center justify-between transition select-none ${
                          isSelected
                            ? 'bg-[#FAF7FD] hover:bg-[#EDE3FA]/60 text-[#17233B] font-bold'
                            : 'hover:bg-slate-50 text-[#17233B]'
                        }`}
                      >
                        <div className="flex items-center space-x-3 pr-2 min-w-0">
                          {/* Checkbox box */}
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                              isSelected
                                ? 'bg-[#55175E] border-[#55175E] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-bold tracking-tight">
                                {item.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getClassBadgeStyle(
                                  item.class
                                )}`}
                              >
                                {item.class}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#64748B] truncate font-normal mt-0.5">
                              {item.impact}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              item.frequency === 'High'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-[#64748B]'
                            }`}
                          >
                            {item.frequency} Prev
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom status footer */}
              <div className="p-2.5 border-t border-[#E5EAF0] bg-[#FAF7FD] flex items-center justify-between text-[11px] text-[#64748B]">
                <span>
                  Showing {filteredMutations.length} of {MUTATION_CATALOG.length} mutations
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 bg-[#55175E] hover:bg-[#421047] text-white font-bold rounded-md shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SELECTED MUTATIONS CHIPS / TAGS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="block text-xs font-bold text-[#17233B] uppercase tracking-wider">
            Selected Mutations for Analysis ({selectedMutations.length})
          </span>
          {selectedMutations.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline"
            >
              Clear All
            </button>
          )}
        </div>

        {selectedMutations.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#E5EAF0] bg-white text-center">
            <p className="text-[#94A3B8] text-xs italic">
              No mutations selected yet. Click the dropdown above to select mutations (e.g. M184V, K103N, K65R).
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-3 bg-white border border-[#E5EAF0] rounded-xl">
            {selectedMutations.map((mut) => {
              const info = MUTATION_CATALOG.find((m) => m.name === mut);
              return (
                <span
                  key={mut}
                  className="inline-flex items-center pl-2.5 pr-1.5 py-1 rounded-lg bg-[#FAF7FD] text-[#55175E] font-bold border border-[#D8C6EE] text-xs shadow-2xs space-x-1.5 group transition hover:bg-[#EDE3FA]"
                  title={info ? `${info.class}: ${info.impact}` : 'Custom mutation'}
                >
                  <span>{mut}</span>
                  {info && (
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#EDE3FA] text-[#55175E]">
                      {info.class}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveMutation(mut, e)}
                    className="p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-700 text-[#55175E] transition"
                    aria-label={`Remove mutation ${mut}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
