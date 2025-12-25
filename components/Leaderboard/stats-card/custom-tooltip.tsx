export const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name?: string; value: number; color?: string } }> }) => {
  if (!active || !payload?.length) return null;

  const { name = "Activities", value, color } = payload?.[0]?.payload || {};

  return (
    <div className="rounded-lg flex items-center gap-2 border bg-white dark:border-white/10 dark:bg-zinc-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full mb-0.5"
          style={{ backgroundColor: color ? color : "#50B78B" }}
        />
        <span className="dark:text-zinc-300 text-black font-medium">{name}</span>
      </div>
      <div className="dark:text-white text-black font-semibold">
        {value}
      </div>
    </div>
  );
};