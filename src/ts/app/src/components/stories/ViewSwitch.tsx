import Link from "next/link";

import { DayView, dayHref } from "@/lib/story-display";
import styles from "./ViewSwitch.module.css";

interface ViewSwitchProps {
  category: string;
  day: string;
  view: DayView;
  storyCount: number;
  claimCount: number;
}

/** Switches the day between its stories and its claims. */
export function ViewSwitch({
  category,
  day,
  view,
  storyCount,
  claimCount,
}: ViewSwitchProps) {
  const options = [
    { view: DayView.Stories, label: "Stories", count: storyCount },
    { view: DayView.Claims, label: "Claims", count: claimCount },
  ];

  return (
    <nav aria-label="View" className={styles.switch}>
      {options.map((option) => (
        <Link
          key={option.view}
          href={dayHref(category, day, { view: option.view })}
          className={styles.option}
          aria-current={option.view === view ? "page" : undefined}
        >
          {option.label}
          <span className={styles.count}>{option.count}</span>
        </Link>
      ))}
    </nav>
  );
}
