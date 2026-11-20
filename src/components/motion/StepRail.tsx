export type StepRailItem = {
  label: string;
  value?: string;
  danger?: boolean;
};

export function StepRail({ items, active }: { items: StepRailItem[]; active?: number }) {
  return (
    <ol className="step-rail">
      {items.map((item, index) => {
        const on = active === index;
        return (
          <li key={`${item.label}-${index}`} className="step-rail-item" data-active={on ? "true" : "false"} data-danger={on && item.danger ? "true" : "false"}>
            <span className="step-rail-mark" aria-hidden="true" />
            <span className="step-rail-label">{item.label}</span>
            <span className="step-rail-value">{item.value}</span>
          </li>
        );
      })}
    </ol>
  );
}
