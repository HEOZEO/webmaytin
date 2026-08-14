import React, { createContext, useContext, useState, useEffect } from 'react';

const CompareContext = createContext();

const MAX_COMPARE = 3;

export const CompareProvider = ({ children }) => {
  const [compare, setCompare] = useState(() => {
    const saved = localStorage.getItem('compare');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('compare', JSON.stringify(compare));
  }, [compare]);

  const addToCompare = (product) => {
    if (compare.length >= MAX_COMPARE) {
      // Return unchanged + signal via return value
      return compare;
    }
    if (compare.find(p => p.id === product.id)) {
      return compare;
    }
    const next = [...compare, product];
    setCompare(next);
    return next;
  };

  const removeFromCompare = (productId) => {
    setCompare(prev => prev.filter(p => p.id !== productId));
  };

  const clearCompare = () => setCompare([]);

  const isInCompare = (productId) => compare.some(p => p.id === productId);

  const compareCount = compare.length;

  return (
    <CompareContext.Provider value={{
      compare, addToCompare, removeFromCompare, clearCompare, isInCompare, compareCount, MAX_COMPARE
    }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => useContext(CompareContext);
