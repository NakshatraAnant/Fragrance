import { saveSettingJson } from "@/app/actions/admin/growth";

/** JSON editor for a validated setting (schema-checked server-side with zod before saving). */
export function SettingEditor({ k, value, back, note, rows = 10 }: { k: string; value: unknown; back: string; note?: string; rows?: number }) {
  return (
    <form action={saveSettingJson} className="card grid gap-2 p-4">
      <input type="hidden" name="key" value={k} /><input type="hidden" name="back" value={back} />
      <div className="flex items-center justify-between"><p className="font-mono text-sm font-semibold">{k}</p><button className="btn btn-primary btn-sm">Save</button></div>
      {note && <p className="text-xs text-muted">{note}</p>}
      <textarea name="value" rows={rows} defaultValue={JSON.stringify(value, null, 2)} className="textarea font-mono text-xs" spellCheck={false} aria-label={`${k} configuration JSON`} />
    </form>
  );
}
