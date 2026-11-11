/** فیلد فرم با برچسب و پیام خطا (WCAG: برچسب صریح، aria-invalid، aria-describedby) */
export function Field({
  name,
  label,
  error,
  defaultValue,
  type = "text",
  inputMode,
  dir,
  autoComplete,
  required,
}: {
  name: string;
  label: string;
  error?: string;
  defaultValue?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  dir?: "ltr" | "rtl";
  autoComplete?: string;
  required?: boolean;
}) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        dir={dir}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className={`rounded-ctl bg-surface focus:border-copper min-h-12 border-[1.5px] px-3 focus:outline-none ${error ? "border-bad" : "border-line"}`}
      />
      {error && (
        <span id={`${id}-err`} className="text-bad text-xs">
          {error}
        </span>
      )}
    </div>
  );
}
