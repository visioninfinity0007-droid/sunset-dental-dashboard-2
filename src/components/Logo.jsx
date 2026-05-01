export default function Logo({ size = 36, withText = true }) {
  return (
    <a href="/" className="inline-flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="Vision Infinity"
        style={{ height: size, width: "auto" }}
      />
      {withText && (
        <span className="font-poppins font-semibold text-white tracking-tight">
          Vision Infinity
        </span>
      )}
    </a>
  );
}
