"use client";

import { cx } from "./cx";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  label: string;
};

export function Tabs({ tabs, value, onValueChange, label }: TabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          className={cx("tab")}
          onClick={() => onValueChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
