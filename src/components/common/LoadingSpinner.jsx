export default function LoadingSpinner({
  size = 'h-8 w-8',
  color = 'border-teal-500',
}) {
  return (
    <div className="flex items-center justify-center w-full h-full py-12">
      <div
        className={`${size} animate-spin rounded-full border-[3px] border-gray-200 ${color} border-t-transparent`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
